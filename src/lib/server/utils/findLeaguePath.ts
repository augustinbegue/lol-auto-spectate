import { error } from "@sveltejs/kit";
import fs from "fs";
import path from "path";

export function findLeaguePath() {
    let base_path = "C:\\Riot Games\\League of Legends\\";

    // Check if the path exists
    if (fs.existsSync(base_path)) {
        let gameFolder = "Game";

        // Check if the game folder exists
        if (fs.existsSync(path.join(base_path, gameFolder))) {
            return path.join(base_path, gameFolder);
        } else {
            throw error(
                500,
                `Game folder not found (${path.join(base_path, gameFolder)})`,
            );
        }
    } else {
        throw error(500, `Base folder not found (${base_path})`);
    }
}
