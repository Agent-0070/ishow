import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';
import { uploadImage, uploadImages, uploadSignature, deleteImage } from '../controllers/uploadController.js';

const router = Router();

router.post('/image', authRequired, upload.single('image'), uploadImage);
router.post('/images', authRequired, upload.array('images', 10), uploadImages);
router.delete('/image/:publicId', authRequired, deleteImage);
router.get('/signature', authRequired, uploadSignature);

export default router;
