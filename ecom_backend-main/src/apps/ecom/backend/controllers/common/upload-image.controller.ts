import { Request, Response } from "express";
import { Controller } from "../controller";
import cloudinary from "../../../../../contexts/shared/infrastructure/uploads/cloudinary";
import fs from "fs/promises";

export class UploadImageController implements Controller {

    public async invoke(req: Request, res: Response): Promise<void> {
        try {
            const file = req.file

            
            if (!file) {
                res.status(400).json({ message: "File not found" });
                return;
            }

            // Check if Cloudinary is configured
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                // Move to public/uploads for development
                const fs = require('fs').promises;
                const path = require('path');
                const uploadsDir = path.join(__dirname, '../../../../../public/uploads');
                await fs.mkdir(uploadsDir, { recursive: true });
                const destPath = path.join(uploadsDir, file.filename);
                await fs.rename(file.path, destPath);
                const localUrl = `http://localhost:5000/uploads/${file.filename}`;
                res.status(200).json({
                    message: "File uploaded successfully (local)",
                    url: localUrl,
                });
                return;
            }

            const uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: "ecom",
            });

            await fs.unlink(file.path);

            res.status(200).json({
                message: "File uploaded successfully",
                url: uploadResult.secure_url,
            });

        } catch (error) {
            res.status(500).json({
                message: "Error uploading file",
                error: error,
            });
        }




    }
}