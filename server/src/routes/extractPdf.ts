import { Router } from 'express';
import multer from 'multer';

const extractPdfRouter = Router();

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

extractPdfRouter.post('/extract-pdf', upload.single('resume'), async (req: any, res: any): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, error: 'No PDF file uploaded.' });
            return;
        }

        const buffer = req.file.buffer;

        // Dynamically import pdf-parse to avoid esm/cjs issues
        const pdfParseModule = (await import('pdf-parse')) as any;
        const pdfParse = pdfParseModule.default || pdfParseModule;

        const pdfData = await pdfParse(buffer);

        res.json({
            success: true,
            text: pdfData.text,
        });

    } catch (error: any) {
        console.error('❌ Extract PDF error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to extract text from PDF.' });
    }
});

export { extractPdfRouter };
