import jwt from "jsonwebtoken";

function authRequired(req,res,next){
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  console.log('🔐 Auth check:', {
    hasAuth: !!auth,
    hasToken: !!token,
    path: req.path,
    method: req.method
  });

  if(!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: "No token" });
  }

  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    console.log('✅ Auth successful for user:', payload.id);
    next();
  }catch(e){
    console.log('❌ Invalid token:', e.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(...roles){
  return (req,res,next)=>{
    if(!req.user || !roles.includes(req.user.role)){
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export {
  authRequired,
  requireRole
};
