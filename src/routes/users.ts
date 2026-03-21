import express from "express";
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {user} from "../db/schema/index.js";
import {db} from "../db/index.js";

const router = express.Router();

// Get all users with optional search filtering (name or email), role filtering, and pagination.
router.get("/", async (req, res) => {
  try {
    const {search, role, page, limit} = req.query;
    const rawPage = Array.isArray(page) ? page[0] : page;
    const rawLimit = Array.isArray(limit) ? limit[0] : limit;
    const parsedPage = Number.parseInt(String(rawPage ?? "1"), 10);
    const parsedLimit = Number.parseInt(String(rawLimit ?? "10"), 10);
    const currentPage =
      Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitPerPage =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 10;
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    // if search query is provided, filter by user name or user email
    if (search) {
      filterConditions.push(
        or(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`),
        ),
      );
    }

    // if role query is provided, filter by exact role match
    if (role) {
      filterConditions.push(eq(user.role, role as "admin" | "teacher" | "student"));
    }

    // Combine all filters using AND operator if any exist
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Count query using drizzle sql count(*) with same where clause
    const countResult = await db
      .select({count: sql<number>`count(*)`})
      .from(user)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    // Data query with orderBy user.createdAt desc, limit, offset
    const userList = await db
      .select({
        ...getTableColumns(user),
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: userList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });

  } catch (e) {
    console.error(`GET /users error: ${e}`);
    res.status(500).json({error: "Internal Server Error : failed to fetch users"});
  }
});

export default router;
