import express from "express";

import { handler } from "./build/handler.js";

const app = express();

app.use(handler);

app.listen(3000, () => {
    console.log("[SERVER] Server started on port 3000");
});
