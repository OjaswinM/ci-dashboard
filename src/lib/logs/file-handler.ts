import fs from 'fs/promises';
import AdmZip from "adm-zip";
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import JSZip, { files } from 'jszip';
import { extract } from 'tar';
import { createUnzip } from 'zlib';
import os from 'os';
import { LogFile, LogFileType } from '../validation/test-logs';

export interface IFileHandler {
  getLogFiles(logPath: string): Promise<LogFile[]>;
  getLogContent(filePath: string, cursor?: string, chunkSize?: number): Promise<{ content: string; hasMore: boolean; nextCursor?: string }>;
  cleanup?(): Promise<void>;
}

export class LocalFileHandler implements IFileHandler {
  async getLogFiles(logPath: string): Promise<LogFile[]> {
    try {
      const stats = await fs.stat(logPath);
      
      if (!stats.isFile()) {
        throw new Error('Log path is not a file');
      }

      const ext = path.extname(logPath).toLowerCase();
      
      // Determine file type based on extension
      const isArchive = ['.tar.gz', '.tgz', '.gz', '.zip'].includes(ext);
      const fileType: LogFileType = isArchive ? 'archive' : 'text';
      
      // Handle text files - return as-is
      if (!isArchive) {
        return [{
          path: logPath,
          size: stats.size,
          type: fileType
        }];
      }
      
      if (fileType === 'archive') {
        const extractDir = path.join(path.dirname(logPath), path.basename(logPath, ext));
        
        // Check if already extracted
        try {
          const extractedStats = await fs.stat(extractDir);
          if (extractedStats.isDirectory()) {
            try {
                return await this.listFiles(extractDir);
            } catch (error) {
              console.log(`Error reading extracted files, re-extracting: ${error}`);
            }
          }
        } catch (error) {
          // Directory doesn't exist, proceed with extraction
          console.log(`Extraction directory does not exist: ${extractDir}`);
        }
        
        if (ext === '.zip') {
          await this.extractZip(logPath, extractDir);
          const files = await this.listFiles(extractDir);
          return files;
        } else if (logPath.endsWith('.tar.gz') || logPath.endsWith('.tar')) {
          await this.extractTar(logPath, extractDir);
          const files = await this.listFiles(extractDir);
          return files;
        } 
      }

      throw new Error(`Unsupported file type: ${ext}`);
    } catch (error) {
      throw error;
    }
  }

  async getLogContent(filePath: string, cursor = '0', chunkSize = 50000): Promise<{ content: string; hasMore: boolean; nextCursor?: string }> {
    const start = parseInt(cursor);
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    
    try {
      const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, start);
      const content = buffer.slice(0, bytesRead).toString('utf-8');
      const stats = await fs.stat(filePath);
      
      const hasMore = start + bytesRead < stats.size;
      const nextCursor = hasMore ? (start + bytesRead).toString() : undefined;

      return { content, hasMore, nextCursor };
    } finally {
      await fileHandle.close();
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed - we keep extracted files for future use
    return;
  }

  private async extractGzip(source: string, destination: string): Promise<void> {
    try {
      const destDir = path.dirname(destination);
      await fs.mkdir(destDir, { recursive: true });
      
      // Check if we have write permission to the directory
      await fs.access(destDir, fs.constants.W_OK);
      
      return new Promise((resolve, reject) => {
        const gunzip = createUnzip();
        const sourceStream = createReadStream(source);
        const destStream = createWriteStream(destination);

        sourceStream
          .pipe(gunzip)
          .pipe(destStream)
          .on('finish', resolve)
          .on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to extract gzip: ${error}`);
      throw error;
    }
  }

  private async extractTar(source: string, destination: string): Promise<void> {
    try {
      await fs.mkdir(destination, { recursive: true });
      
      // Check if we have write permission to the directory
      await fs.access(destination, fs.constants.W_OK);
      
      return new Promise((resolve, reject) => {
        createReadStream(source)
          .pipe(createUnzip())
          .pipe(extract({ cwd: destination }))
          .on('finish', resolve)
          .on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to extract tar: ${error}`);
      throw error;
    }
  }

  private async extractZip(source: string, destination: string): Promise<void> {
    try {
      await fs.mkdir(destination, { recursive: true });
      
      // Check if we have write permission to the directory
      await fs.access(destination, fs.constants.W_OK);

      const zip = new AdmZip(source);
      zip.extractAllTo(destination, true);
    } catch (error) {
      console.error(`Failed to extract zip: ${error}`);
      throw error;
    }
  }

  private async listFiles(dir: string): Promise<LogFile[]> {
    const files: LogFile[] = [];
    
    async function scan(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            size: stats.size,
            type: 'text' as LogFileType
          });
        }
      }
    }

    await scan(dir);
    return files;
  }
}
