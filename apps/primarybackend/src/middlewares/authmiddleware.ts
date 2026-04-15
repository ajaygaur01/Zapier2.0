import jwt from "jsonwebtoken";

const jwtsecret = process.env.JWT_SECRET;

if (!jwtsecret) {
  throw new Error("JWT_SECRET not defined");
}

export const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  // Step 1: Validate header
  if (!authHeader || typeof authHeader !== "string") {
    return res.status(403).json({ message: "You are not logged in" });
  }

  // Step 2: Extract token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token || token === "null" || token === "undefined") {
    return res.status(403).json({ message: "You are not logged in" });
  }

  try {
    // Step 3: Verify token
    const payload = jwt.verify(token, jwtsecret) as { id: number | string };

    // Step 4: Normalize ID
    const id = payload?.id;
    const userId =
      typeof id === "number" ? id : parseInt(String(id), 10);

    if (Number.isNaN(userId) || userId < 1) {
      return res.status(403).json({ message: "Invalid token" });
    }

    // Step 5: Attach to request
    req.id = String(userId);

    // Step 6: Continue pipeline
    next();
  } catch (err) {
    return res.status(403).json({ message: "You are not logged in" });
  }
};











