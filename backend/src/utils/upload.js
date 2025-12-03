import multer from "multer";
import path from "path";
import fs from "fs";

const dir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, dir),
  filename: (req,file,cb)=> {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, unique + ext);
  }
});

function imageFilter(req,file,cb){
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed"));
}

export const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 8 * 1024 * 1024 } });
