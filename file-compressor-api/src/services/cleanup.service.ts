import fs from 'fs';
import path from 'path';

export class CleanupService {
  private static readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private static readonly UPLOADS_DIR = path.join(__dirname, '../../uploads');

  static scheduleCleanup(filePath: string) {
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up file: ${filePath}`);
        }
      } catch (error) {
        console.error(`Failed to clean up file: ${filePath}`, error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  static cleanupAll() {
    try {
      const files = fs.readdirSync(this.UPLOADS_DIR);
      files.forEach(file => {
        const filePath = path.join(this.UPLOADS_DIR, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up file: ${filePath}`);
        }
      });
    } catch (error) {
      console.error('Failed to clean up files:', error);
    }
  }
} 