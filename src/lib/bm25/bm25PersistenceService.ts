import { BM25Service } from './bm25Service';
import { events, tables } from '@/livestore/schema';

export class BM25PersistenceService {
  private static instance: BM25PersistenceService;
  private bm25Service: BM25Service;

  constructor(bm25Service: BM25Service) {
    this.bm25Service = bm25Service;
  }

  static getInstance(bm25Service: BM25Service): BM25PersistenceService {
    if (!BM25PersistenceService.instance) {
      BM25PersistenceService.instance = new BM25PersistenceService(bm25Service);
    }
    return BM25PersistenceService.instance;
  }

  /**
   * Save BM25 index to LiveStore
   */
  async saveIndex(tableApi: any): Promise<void> {
    const metadata = await this.bm25Service.getIndexMetadata();
    const serializedData = this.bm25Service.serialize();
    
    const indexId = 'bm25-main-index';
    const now = new Date().toISOString();

    // For now, always create/update - proper querying would require more LiveStore setup
    try {
      await tableApi.insert({
        id: indexId,
        version: metadata.version,
        checksum: metadata.checksum,
        data: serializedData,
        metadata,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      // If insert fails due to existing key, update instead
      await tableApi.update(
        { 
          version: metadata.version,
          checksum: metadata.checksum,
          data: serializedData,
          metadata,
          updatedAt: now
        },
        { where: { id: indexId } }
      );
    }
  }

  /**
   * Load BM25 index from LiveStore
   */
  async loadIndex(tableApi: any, indexId: string = 'bm25-main-index'): Promise<BM25Service | null> {
    const indexData = await this.getIndex(tableApi, indexId);
    
    if (!indexData) {
      return null;
    }

    try {
      const restoredService = BM25Service.deserialize(indexData.data);
      
      // Verify checksum for data integrity
      const currentChecksum = await restoredService.getIndexChecksum();
      if (currentChecksum !== indexData.checksum) {
        console.warn('BM25 index checksum mismatch - data may be corrupted');
        return null;
      }

      return restoredService;
    } catch (error) {
      console.error('Failed to deserialize BM25 index:', error);
      return null;
    }
  }

  /**
   * Delete BM25 index from LiveStore
   */
  async deleteIndex(tableApi: any, indexId: string = 'bm25-main-index'): Promise<void> {
    await tableApi.delete({ where: { id: indexId } });
  }

  /**
   * Get index data from LiveStore
   */
  private async getIndex(tableApi: any, indexId: string) {
    try {
      const result = await tableApi.findOne({ where: { id: indexId } });
      return result;
    } catch (error) {
      console.warn('Failed to load BM25 index from LiveStore:', error);
      return null;
    }
  }

  /**
   * Auto-save index when it changes
   */
  async autoSave(tableApi: any): Promise<void> {
    try {
      await this.saveIndex(tableApi);
      console.log('BM25 index auto-saved successfully');
    } catch (error) {
      console.error('Failed to auto-save BM25 index:', error);
    }
  }
}