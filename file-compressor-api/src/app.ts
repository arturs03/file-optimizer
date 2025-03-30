import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { WorkerPoolService } from './services/worker-pool.service';
import { FileInfo } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const workerPool = new WorkerPoolService(4); // Use 4 workers by default

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// File upload and compression endpoint
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const fileInfo: FileInfo = {
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      filename: req.file.filename
    };

    const result = await workerPool.compress(fileInfo);
    
    res.json({ 
      message: 'File compressed successfully',
      originalFilename: req.file.originalname,
      compressedFilename: path.basename(result.outputPath),
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio,
      format: result.format
    });
  } catch (error) {
    console.error('Compression error:', error);
    res.status(500).json({ error: 'Failed to compress file' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app; 