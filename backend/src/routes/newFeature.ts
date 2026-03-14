import express from "express";
export function setupNewFeatureRoutes() {
    const router = express.Router();
    router.post("/do-something", (req, res) => {
        res.json({ message: "Success" });
    });
    return router;
}