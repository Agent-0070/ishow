import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const validateRegister = [
  body("name").isString().isLength({ min: 2 }),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
];

export const validateLogin = [
  body("email").isEmail(),
  body("password").isString().isLength({ min: 6 }),
];
export const validateUpdateProfile = [
  body("name").optional().isString().isLength({ min: 2, max: 100 }),
  body("displayPicture").optional().custom((value) => {
    if (value === "" || value === null || value === undefined) return true;
    return /^https?:\/\/.+/.test(value);
  }).withMessage("Display picture must be a valid URL"),
  body("displayPicturePublicId").optional().custom((value) => {
    if (value === "" || value === null || value === undefined) return true;
    return typeof value === 'string' && value.length <= 200;
  }),
  body("bio").optional().custom((value) => {
    if (value === "" || value === null || value === undefined) return true;
    return typeof value === 'string' && value.length <= 1000;
  }),
  body("companyDescription").optional().custom((value) => {
    if (value === "" || value === null || value === undefined) return true;
    return typeof value === 'string' && value.length <= 2000;
  }),
  body("hostingCountries").optional().isArray({ max: 50 }),
  body("hostingCountries.*").optional().isString().isLength({ min: 2, max: 100 }),
  body("partners").optional().isArray({ max: 50 }),
  body("partners.*.name").optional().isString().isLength({ min: 1, max: 200 }),
  body("partners.*.type").optional().isIn(['company','individual','organization']),
  body("partners.*.description").optional().isString().isLength({ max: 1000 }),
  body("homeAddress").optional().custom((value) => {
    if (value === "" || value === null || value === undefined) return true;
    return typeof value === 'string' && value.length <= 500;
  }),
  body("companyAddress").optional().custom((value) => {
    if (value === "" || value === null || value === undefined) return true;
    return typeof value === 'string' && value.length <= 500;
  }),
];


export async function register(req,res,next){
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already in use" });
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
  }catch(e){ next(e); }
}

function firstValidationError(req){
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error(errors.array()[0]?.msg || 'Validation error');
    err.status = 400;
    throw err;
  }
}

export async function login(req,res,next){
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (user.isBanned) return res.status(403).json({ message: "Account banned" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  }catch(e){ next(e); }
}

export async function me(req,res,next){
  try{
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  }catch(e){ next(e); }
}

export async function updateProfile(req,res,next){
  try{
    firstValidationError(req);
    const updates = {};
    ["name","avatar","displayPicture","displayPicturePublicId","homeAddress","companyAddress","bio","companyDescription","hostingCountries","pastEvents","partners"].forEach(k=>{ if (k in req.body) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
    res.json(user);
  }catch(e){ next(e); }
}

export async function updatePassword(req,res,next){
  try{
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Current password incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated" });
  }catch(e){ next(e); }
}
