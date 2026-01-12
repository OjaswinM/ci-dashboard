import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import JSZip from 'jszip';

/**
 * @typedef {Object} LogFile
 * @property {string} path - Path to the log file
 * @property {number} size - Size of the file in bytes
 * @property {'text' | 'archive'} type - Type of the file
 */

/**
 * @interface IFileHandler
 */
export class FileHandler {
  /**
   * Get list of log files
   * @param {string} logPath - Path to the log file or directory
   * @returns {Promise<LogFile[]>} Array of log files
   */
  async getLogFiles(logPath) {
    try {
      const stats = await fs.stat(logPath);
      
      if (!stats.isFile()) {
        throw new Error('Log path is not a file');
      }

      const ext = path.extname(logPath).toLowerCase();
      
      // Determine file type based on extension
      const isArchive = ['.tar.gz', '.tgz', '.gz', '.zip'].includes(ext);
      const fileType = isArchive ? 'archive' : 'text';
      
      // Handle text files - return as-is
      if (!isArchive) {
        return [{
          path: logPath,
          size: stats.size,
          type: 'text'
        }];
      }

      // For archives, extract and list files
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
      
      // Extract based on file type
      if (ext === '.zip') {
        await this.extractZip(logPath, extractDir);
      } else if (ext === '.gz' || ext === '.tgz') {
        await this.extractGzip(logPath, extractDir);
      } else if (ext.endsWith('.tar.gz') || ext === '.tar') {
        await this.extractTar(logPath, extractDir);
      }

      return await this.listFiles(extractDir);
    } catch (error) {
      console.error('Error accessing log files:', error);
      throw error;
    }
  }

  /**
   * Get content of a log file
   * @param {string} filePath - Path to the log file
   * @param {string} [cursor] - Cursor for pagination
   * @param {number} [chunkSize=32768] - Size of chunks to read
   * @returns {Promise<{ content: string, hasMore: boolean, nextCursor?: string }>}
   */
  async getLogContent(filePath, cursor, chunkSize = 32768) {
    const ext = path.extname(filePath).toLowerCase();
    const isGzip = ['.gz', '.tgz'].includes(ext);

    try {
      if (!isGzip) {
        // For text files, read directly
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          content,
          hasMore: false
        };
      }

      // For gzipped files, decompress while reading
      const readStream = createReadStream(filePath);
      const gunzip = createGunzip();
      
      let content = '';
      await pipeline(readStream, gunzip, async function* (source) {
        for await (const chunk of source) {
          content += chunk.toString('utf-8');
        }
      });

      return {
        content,
        hasMore: false
      };
    } catch (error) {
      console.error('Error reading log content:', error);
      throw error;
    }
  }

  /**
   * Clean up any temporary files
   * @returns {Promise<void>}
   */
  async listFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        files.push({
          path: fullPath,
          size: stats.size,
          type: 'text'
        });
      }
    }

    return files;
  }

  async extractZip(source, destination) {
    const zipData = await fs.readFile(source);
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(zipData);
    
    // Create destination directory
    await fs.mkdir(destination, { recursive: true });

    // Extract each file
    for (const [filename, file] of Object.entries(zipContents.files)) {
      if (!file.dir) {
        const content = await file.async('nodebuffer');
        const filePath = path.join(destination, filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content);
      }
    }
  }

  async extractGzip(source, destination) {
    await fs.mkdir(destination, { recursive: true });
    const destFile = path.join(destination, path.basename(source, '.gz'));
    
    const readStream = createReadStream(source);
    const writeStream = createWriteStream(destFile);
    const gunzip = createGunzip();
    
    await pipeline(readStream, gunzip, writeStream);
  }

  async extractTar(source, destination) {
    await fs.mkdir(destination, { recursive: true });
    const readStream = createReadStream(source);
    const gunzip = source.endsWith('.gz') ? createGunzip() : null;
    
    if (gunzip) {
      await pipeline(readStream, gunzip, async function* (source) {
        for await (const chunk of source) {
          // Extract tar contents
          const entry = chunk.toString();
          const filePath = path.join(destination, entry.name);
          if (entry.type === 'file') {
            await fs.writeFile(filePath, entry.data);
          }
        }
      });
    } else {
      // Handle uncompressed tar
      await pipeline(readStream, async function* (source) {
        for await (const chunk of source) {
          // Extract tar contents
          const entry = chunk.toString();
          const filePath = path.join(destination, entry.name);
          if (entry.type === 'file') {
            await fs.writeFile(filePath, entry.data);
          }
        }
      });
    }
  }

  async cleanup() {
    // No cleanup needed in this implementation
  }
}

export const fileHandler = new FileHandler();
