const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
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

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        attempts++;
        const client = new ftp.Client();
        client.ftp.verbose = true;
        client.ftp.timeout = 180000;

        try {
            console.log(`\n--- Deployment Attempt ${attempts}/${maxAttempts} ---`);
            console.log("Connecting to Hostinger FTP (217.21.85.181)...");
            await client.access({
                host: "217.21.85.181",
                user: "u338378078",
                password: "NetraFtp2026Secure!#",
                secure: false
            });

            console.log("Navigating to target document root: domains/netraunnayan.com/public_html...");
            await client.cd("domains/netraunnayan.com/public_html");

            try {
                await client.remove("default.php");
            } catch (e) {
                // Ignore
            }

            console.log("Uploading application files to Hostinger...");
            await client.uploadFromDir(deployDir);

            console.log(">>> DEPLOYMENT COMPLETED SUCCESSFULLY! <<<");
            client.close();
            return;
        } catch (err) {
            console.error(`Attempt ${attempts} failed:`, err.message || err);
            client.close();
            if (attempts >= maxAttempts) {
                console.error("All deployment attempts failed.");
                process.exit(1);
            }
            console.log("Retrying in 5 seconds...");
            await new Promise(r => setTimeout(r, 5000));
        }
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
