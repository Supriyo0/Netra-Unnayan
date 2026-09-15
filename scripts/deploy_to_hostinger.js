const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log("1. Preparing deployment directory...");
        const deployDir = path.join(__dirname, "../dist_deploy");
        if (fs.existsSync(deployDir)) {
            fs.rmSync(deployDir, { recursive: true, force: true });
        }
        fs.mkdirSync(deployDir, { recursive: true });

        // Copy frontend/dist to root of deployDir
        const frontendDist = path.join(__dirname, "../frontend/dist");
        if (!fs.existsSync(frontendDist)) {
            throw new Error("frontend/dist does not exist! Please run npm run build in frontend first.");
        }
        copyRecursiveSync(frontendDist, deployDir);

        // Copy backend to deployDir/backend
        const backendDir = path.join(__dirname, "../backend");
        const targetBackend = path.join(deployDir, "backend");
        copyRecursiveSync(backendDir, targetBackend);

        // Copy public_assets to deployDir/public_assets
        const publicAssetsDir = path.join(__dirname, "../public_assets");
        const targetAssets = path.join(deployDir, "public_assets");
        copyRecursiveSync(publicAssetsDir, targetAssets);

        // Copy .htaccess
        const htaccessFile = path.join(__dirname, "../.htaccess");
        if (fs.existsSync(htaccessFile)) {
            fs.copyFileSync(htaccessFile, path.join(deployDir, ".htaccess"));
        }

        console.log("2. Connecting to Hostinger FTP (217.21.85.181)...");
        await client.access({
            host: "217.21.85.181",
            user: "u338378078",
            password: "NetraFtp2026Secure!#",
            secure: false
        });

        console.log("3. Navigating to target document root: domains/netraunnayan.com/public_html...");
        await client.cd("domains/netraunnayan.com/public_html");

        // Remove Hostinger default.php placeholder if present
        try {
            await client.remove("default.php");
            console.log("Removed default.php placeholder.");
        } catch (e) {
            // Already deleted or not present
        }

        console.log("4. Uploading all application files to Hostinger...");
        await client.uploadFromDir(deployDir);

        console.log("5. Deployment completed successfully!");
    } catch (err) {
        console.error("Deployment failed:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

deploy();
