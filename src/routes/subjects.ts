import express from "express";
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {departments, subjects} from "../db/schema";
import {db} from "../db";

const router = express.Router();
// Get all subjects with optional search filtering and pagination.
router.get("/", async (req, res) => {
  try {
    const {search, department, page, limit} = req.query;
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
    //if search query is provided, filter by subject name or subject code
    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`),
        ),
      );
    }
    //if departments query is provided, filtered by department
    if (department) {
      filterConditions.push(ilike(departments.name, `%${department}%`));
      const deptPattern = `%${String(department).replace(/[%_]/g, '\\$&')}%`; //to prevent sql injection
      filterConditions.push(ilike(departments.name, deptPattern));
    }

    //Combine all filters using AND operator if any exist
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({count: sql<number>`count(*)`})
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects), department: {...getTableColumns(departments)},
      }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);
    res.status(200).json({
      subjects: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },

    });

  } catch (e) {
    console.error(`GET /subjects error: ${e}`);
    res.status(500).json({error: "Internal Server Error : failed to fetch subjects"});
  }
});

export default router;