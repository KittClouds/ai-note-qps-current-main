
import { CytoscapeGraphData, cytoscapeGraphModel } from './cytoscapeGraphModel';
import { KnowledgeGraph } from './types';
import { Note, FileSystemItem } from '@/types/notes';
import { ParsedConnections } from '@/utils/parsingUtils';

export interface GraphFile {
  id: string;
  noteId?: string;
  filename: string;
  graphData: CytoscapeGraphData;
  created: string;
  type: 'note-graph' | 'system-graph';
}

export class GraphFileService {
  private static readonly STORAGE_KEY = 'knowledge-graph-files';
  private static readonly SYSTEM_GRAPH_KEY = 'system-knowledge-graph';

  /**
   * Generate and save note-specific graph file
   */
  public async generateNoteGraphFile(
    note: Note,
    knowledgeGraph: KnowledgeGraph,
    connections: ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }
  ): Promise<GraphFile> {
    console.log('[GraphFileService] Generating note graph file for:', note.title);

    const graphData = cytoscapeGraphModel.buildNoteGraph(note, knowledgeGraph, connections);
    const filename = `knowledge-graph-${note.id}-${Date.now()}.json`;
    
    const graphFile: GraphFile = {
      id: `graph-${note.id}-${Date.now()}`,
      noteId: note.id,
      filename,
      graphData,
      created: new Date().toISOString(),
      type: 'note-graph'
    };

    // Save to localStorage
    await this.saveGraphFile(graphFile);
    
    console.log('[GraphFileService] Note graph file generated:', filename);
    return graphFile;
  }

  /**
   * Generate and save system-wide graph file
   */
  public async generateSystemGraphFile(
    items: FileSystemItem[],
    connectionsMap: Map<string, ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }>,
    knowledgeGraphs: Map<string, KnowledgeGraph>
  ): Promise<GraphFile> {
    console.log('[GraphFileService] Generating system graph file');

    const graphData = cytoscapeGraphModel.buildSystemGraph(items, connectionsMap, knowledgeGraphs);
    const filename = `system-graph-${Date.now()}.json`;
    
    const graphFile: GraphFile = {
      id: `system-graph-${Date.now()}`,
      filename,
      graphData,
      created: new Date().toISOString(),
      type: 'system-graph'
    };

    // Save system graph separately - fixed static property access
    localStorage.setItem(GraphFileService.SYSTEM_GRAPH_KEY, JSON.stringify(graphFile));
    
    console.log('[GraphFileService] System graph file generated:', filename);
    return graphFile;
  }

  /**
   * Save graph file to storage
   */
  private async saveGraphFile(graphFile: GraphFile): Promise<void> {
    try {
      const existingFiles = this.getStoredGraphFiles();
      existingFiles.push(graphFile);
      
      // Keep only last 10 files per note to prevent storage bloat
      if (graphFile.noteId) {
        const noteFiles = existingFiles.filter(f => f.noteId === graphFile.noteId);
        if (noteFiles.length > 10) {
          const filesToKeep = noteFiles
            .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
            .slice(0, 10);
          
          const otherFiles = existingFiles.filter(f => f.noteId !== graphFile.noteId);
          localStorage.setItem(GraphFileService.STORAGE_KEY, JSON.stringify([...otherFiles, ...filesToKeep]));
        } else {
          localStorage.setItem(GraphFileService.STORAGE_KEY, JSON.stringify(existingFiles));
        }
      } else {
        localStorage.setItem(GraphFileService.STORAGE_KEY, JSON.stringify(existingFiles));
      }
    } catch (error) {
      console.error('[GraphFileService] Failed to save graph file:', error);
    }
  }

  /**
   * Get all stored graph files
   */
  public getStoredGraphFiles(): GraphFile[] {
    try {
      const stored = localStorage.getItem(GraphFileService.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[GraphFileService] Failed to load graph files:', error);
      return [];
    }
  }

  /**
   * Get graph files for a specific note
   */
  public getNoteGraphFiles(noteId: string): GraphFile[] {
    return this.getStoredGraphFiles().filter(file => file.noteId === noteId);
  }

  /**
   * Get latest system graph
   */
  public getLatestSystemGraph(): GraphFile | null {
    try {
      const stored = localStorage.getItem(GraphFileService.SYSTEM_GRAPH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[GraphFileService] Failed to load system graph:', error);
      return null;
    }
  }

  /**
   * Export graph file as downloadable JSON
   */
  public exportGraphFile(graphFile: GraphFile): void {
    const exportData = {
      ...graphFile,
      exportedAt: new Date().toISOString(),
      cytoscapeFormat: cytoscapeGraphModel.exportGraphJSON(graphFile.noteId)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = graphFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[GraphFileService] Graph file exported:', graphFile.filename);
  }

  /**
   * Delete graph file
   */
  public deleteGraphFile(fileId: string): void {
    try {
      const existingFiles = this.getStoredGraphFiles();
      const updatedFiles = existingFiles.filter(file => file.id !== fileId);
      localStorage.setItem(GraphFileService.STORAGE_KEY, JSON.stringify(updatedFiles));
      console.log('[GraphFileService] Graph file deleted:', fileId);
    } catch (error) {
      console.error('[GraphFileService] Failed to delete graph file:', error);
    }
  }

  /**
   * Get graph statistics
   */
  public getGraphStatistics(): {
    totalFiles: number;
    noteGraphs: number;
    systemGraphs: number;
    totalNodes: number;
    totalEdges: number;
    lastGenerated?: string;
  } {
    const files = this.getStoredGraphFiles();
    const systemGraph = this.getLatestSystemGraph();
    
    const totalNodes = files.reduce((sum, file) => sum + file.graphData.nodes.length, 0);
    const totalEdges = files.reduce((sum, file) => sum + file.graphData.edges.length, 0);
    
    return {
      totalFiles: files.length + (systemGraph ? 1 : 0),
      noteGraphs: files.filter(f => f.type === 'note-graph').length,
      systemGraphs: systemGraph ? 1 : 0,
      totalNodes: totalNodes + (systemGraph ? systemGraph.graphData.nodes.length : 0),
      totalEdges: totalEdges + (systemGraph ? systemGraph.graphData.edges.length : 0),
      lastGenerated: [...files, ...(systemGraph ? [systemGraph] : [])]
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0]?.created
    };
  }
}

export const graphFileService = new GraphFileService();
