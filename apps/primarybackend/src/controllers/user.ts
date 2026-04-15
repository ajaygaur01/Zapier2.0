import { PrismaClient } from "@repo/db";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;


// SIGNUP
export const signup = async (req: any, res: any) => {
  try {
    const { username, password, name } = req.body;

    // Basic validation (no Zod)
    if (!username || !password || !name) {
      return res.status(400).json({ message: "Invalid inputs" });
    }

    // Check existing user
    const userExists = await prisma.user.findFirst({
      where: { email: username },
    });

    if (userExists) {
      return res.status(403).json({ message: "User already exists" });
    }

    // Create user
    await prisma.user.create({
      data: {
        email: username,
        password: password, // ⚠️ should hash
        name: name,
      },
    });

    return res.json({
      message: "Account created. Please verify email",
    });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};



// SIGNIN
export const signin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ message: "Invalid inputs" });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: username,
        password: password,
      },
    });

    if (!user) {
      return res.status(403).json({
        message: "Invalid credentials",
      });
    }

    // Validate userId
    const userId =
      typeof user.id === "number"
        ? user.id
        : parseInt(String(user.id), 10);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(500).json({
        message: "Server error creating session",
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        message: "JWT config missing",
      });
    }

    // Create token
    const token = jwt.sign({ id: userId }, JWT_SECRET);

    return res.json({ token });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};



// GET CURRENT USER
export const getCurrentUser = async (req: any, res: any) => {
  try {
    const id = req.id;

    if (!id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(String(id), 10),
      },
      select: {
        name: true,
        email: true,
      },
    });

    return res.json({ user });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};