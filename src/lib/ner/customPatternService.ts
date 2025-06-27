
import { winkNERService } from './winkService';

export interface CustomPattern {
  id: string;
  name: string;
  entityType: string;
  patterns: string[];
  description: string;
  enabled: boolean;
  confidence: number;
}

export interface PatternCategory {
  id: string;
  name: string;
  description: string;
  patterns: CustomPattern[];
}

export interface PatternLibrary {
  categories: PatternCategory[];
  version: string;
  lastUpdated: Date;
}

// Default pattern library with common entity patterns
const DEFAULT_PATTERN_LIBRARY: PatternLibrary = {
  version: '1.0.0',
  lastUpdated: new Date(),
  categories: [
    {
      id: 'person',
      name: 'Person Names',
      description: 'Patterns for detecting person names',
      patterns: [
        {
          id: 'full-name',
          name: 'Full Name',
          entityType: 'PERSON',
          patterns: ['[PROPN] [PROPN]', '[PROPN] [PROPN] [PROPN]'],
          description: 'Detects full names like "John Smith" or "Mary Jane Watson"',
          enabled: true,
          confidence: 0.9
        },
        {
          id: 'title-name',
          name: 'Title + Name',
          entityType: 'PERSON',
          patterns: ['[Dr.|Mr.|Mrs.|Ms.|Prof.] [PROPN] [PROPN]'],
          description: 'Detects names with titles like "Dr. John Smith"',
          enabled: true,
          confidence: 0.95
        }
      ]
    },
    {
      id: 'organization',
      name: 'Organizations',
      description: 'Patterns for detecting organizations',
      patterns: [
        {
          id: 'company-suffix',
          name: 'Company with Suffix',
          entityType: 'ORGANIZATION',
          patterns: ['[PROPN] [Inc.|LLC|Corp.|Ltd.|Co.]', '[PROPN] [PROPN] [Inc.|LLC|Corp.|Ltd.|Co.]'],
          description: 'Detects companies with legal suffixes',
          enabled: true,
          confidence: 0.9
        }
      ]
    },
    {
      id: 'project',
      name: 'Project Codes',
      description: 'Patterns for project and code identifiers',
      patterns: [
        {
          id: 'project-code',
          name: 'Project Code',
          entityType: 'PROJECT',
          patterns: ['PROJ-[NUM]', 'PROJECT-[NUM]'],
          description: 'Detects project codes like "PROJ-123"',
          enabled: true,
          confidence: 0.8
        },
        {
          id: 'ticket-id',
          name: 'Ticket ID',
          entityType: 'TICKET',
          patterns: ['[TICKET|ISSUE|BUG]-[NUM]'],
          description: 'Detects ticket IDs like "TICKET-456"',
          enabled: true,
          confidence: 0.85
        }
      ]
    },
    {
      id: 'location',
      name: 'Locations',
      description: 'Enhanced location patterns',
      patterns: [
        {
          id: 'city-state',
          name: 'City, State',
          entityType: 'LOCATION',
          patterns: ['[PROPN], [PROPN]', '[PROPN] [PROPN], [PROPN]'],
          description: 'Detects locations like "New York, NY"',
          enabled: true,
          confidence: 0.8
        }
      ]
    }
  ]
};

/**
 * Custom Pattern Service - Manages pattern libraries and integrates with Wink NLP
 */
class CustomPatternService {
  private patternLibrary: PatternLibrary;
  private storageKey = 'ner_custom_patterns';
  private initialized = false;

  constructor() {
    console.log('[CustomPatterns] Service initialized');
    this.loadPatternLibrary();
  }

  /**
   * Load pattern library from localStorage or use defaults
   */
  private loadPatternLibrary(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.patternLibrary = JSON.parse(stored);
        // Ensure dates are properly parsed
        this.patternLibrary.lastUpdated = new Date(this.patternLibrary.lastUpdated);
      } else {
        this.patternLibrary = DEFAULT_PATTERN_LIBRARY;
        this.savePatternLibrary();
      }
      console.log('[CustomPatterns] Pattern library loaded with', this.getEnabledPatternCount(), 'enabled patterns');
    } catch (error) {
      console.error('[CustomPatterns] Failed to load pattern library:', error);
      this.patternLibrary = DEFAULT_PATTERN_LIBRARY;
    }
  }

  /**
   * Save pattern library to localStorage
   */
  private savePatternLibrary(): void {
    try {
      this.patternLibrary.lastUpdated = new Date();
      localStorage.setItem(this.storageKey, JSON.stringify(this.patternLibrary));
      console.log('[CustomPatterns] Pattern library saved');
    } catch (error) {
      console.error('[CustomPatterns] Failed to save pattern library:', error);
    }
  }

  /**
   * Get the current pattern library
   */
  public getPatternLibrary(): PatternLibrary {
    return this.patternLibrary;
  }

  /**
   * Get all enabled patterns formatted for Wink NLP
   */
  public getEnabledPatternsForWink(): Array<{ name: string; patterns: string[] }> {
    const winkPatterns: Array<{ name: string; patterns: string[] }> = [];
    
    this.patternLibrary.categories.forEach(category => {
      category.patterns.forEach(pattern => {
        if (pattern.enabled) {
          winkPatterns.push({
            name: pattern.entityType,
            patterns: pattern.patterns
          });
        }
      });
    });

    console.log('[CustomPatterns] Generated', winkPatterns.length, 'pattern groups for Wink NLP');
    return winkPatterns;
  }

  /**
   * Add a new pattern to a category
   */
  public addPattern(categoryId: string, pattern: Omit<CustomPattern, 'id'>): boolean {
    const category = this.patternLibrary.categories.find(c => c.id === categoryId);
    if (!category) {
      console.error('[CustomPatterns] Category not found:', categoryId);
      return false;
    }

    const newPattern: CustomPattern = {
      ...pattern,
      id: `${categoryId}-${Date.now()}`
    };

    category.patterns.push(newPattern);
    this.savePatternLibrary();
    console.log('[CustomPatterns] Pattern added:', newPattern.name);
    return true;
  }

  /**
   * Update an existing pattern
   */
  public updatePattern(patternId: string, updates: Partial<CustomPattern>): boolean {
    for (const category of this.patternLibrary.categories) {
      const patternIndex = category.patterns.findIndex(p => p.id === patternId);
      if (patternIndex !== -1) {
        category.patterns[patternIndex] = { ...category.patterns[patternIndex], ...updates };
        this.savePatternLibrary();
        console.log('[CustomPatterns] Pattern updated:', patternId);
        return true;
      }
    }
    console.error('[CustomPatterns] Pattern not found:', patternId);
    return false;
  }

  /**
   * Delete a pattern
   */
  public deletePattern(patternId: string): boolean {
    for (const category of this.patternLibrary.categories) {
      const patternIndex = category.patterns.findIndex(p => p.id === patternId);
      if (patternIndex !== -1) {
        category.patterns.splice(patternIndex, 1);
        this.savePatternLibrary();
        console.log('[CustomPatterns] Pattern deleted:', patternId);
        return true;
      }
    }
    console.error('[CustomPatterns] Pattern not found:', patternId);
    return false;
  }

  /**
   * Toggle pattern enabled/disabled
   */
  public togglePattern(patternId: string): boolean {
    for (const category of this.patternLibrary.categories) {
      const pattern = category.patterns.find(p => p.id === patternId);
      if (pattern) {
        pattern.enabled = !pattern.enabled;
        this.savePatternLibrary();
        console.log('[CustomPatterns] Pattern toggled:', patternId, pattern.enabled ? 'enabled' : 'disabled');
        return true;
      }
    }
    return false;
  }

  /**
   * Get pattern statistics
   */
  public getPatternStats(): {
    totalPatterns: number;
    enabledPatterns: number;
    categoriesCount: number;
    entityTypes: string[];
  } {
    const totalPatterns = this.patternLibrary.categories.reduce((sum, cat) => sum + cat.patterns.length, 0);
    const enabledPatterns = this.patternLibrary.categories.reduce(
      (sum, cat) => sum + cat.patterns.filter(p => p.enabled).length, 0
    );
    const entityTypes = [...new Set(
      this.patternLibrary.categories.flatMap(cat => 
        cat.patterns.filter(p => p.enabled).map(p => p.entityType)
      )
    )];

    return {
      totalPatterns,
      enabledPatterns,
      categoriesCount: this.patternLibrary.categories.length,
      entityTypes
    };
  }

  /**
   * Get count of enabled patterns
   */
  public getEnabledPatternCount(): number {
    return this.patternLibrary.categories.reduce(
      (sum, cat) => sum + cat.patterns.filter(p => p.enabled).length, 0
    );
  }

  /**
   * Reset to default patterns
   */
  public resetToDefaults(): void {
    this.patternLibrary = DEFAULT_PATTERN_LIBRARY;
    this.savePatternLibrary();
    console.log('[CustomPatterns] Reset to default patterns');
  }

  /**
   * Export pattern library as JSON
   */
  public exportPatterns(): string {
    return JSON.stringify(this.patternLibrary, null, 2);
  }

  /**
   * Import pattern library from JSON
   */
  public importPatterns(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString) as PatternLibrary;
      // Basic validation
      if (!imported.categories || !Array.isArray(imported.categories)) {
        throw new Error('Invalid pattern library format');
      }
      
      this.patternLibrary = imported;
      this.patternLibrary.lastUpdated = new Date();
      this.savePatternLibrary();
      console.log('[CustomPatterns] Patterns imported successfully');
      return true;
    } catch (error) {
      console.error('[CustomPatterns] Failed to import patterns:', error);
      return false;
    }
  }

  /**
   * Initialize patterns with Wink NLP service
   */
  public async initializePatternsWithWink(): Promise<void> {
    if (this.initialized) return;

    const winkPatterns = this.getEnabledPatternsForWink();
    if (winkPatterns.length > 0) {
      // This will be used by the enhanced Wink service
      console.log('[CustomPatterns] Ready to initialize with Wink NLP');
      this.initialized = true;
    }
  }
}

// Export singleton instance
export const customPatternService = new CustomPatternService();
