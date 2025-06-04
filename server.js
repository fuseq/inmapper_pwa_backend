const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public')); // Statik dosyalar için
app.use(express.json()); // JSON body parsing için

// Proje versiyonlarını tutacak obje
const projectVersions = {};

// Proje klasörlerini kontrol et ve versiyon bilgilerini yükle
function initializeProjectVersions() {
    const publicPath = path.join(__dirname, 'public');
    const dirs = fs.readdirSync(publicPath);
    
    dirs.forEach(dir => {
        const dirPath = path.join(publicPath, dir);
        if (fs.statSync(dirPath).isDirectory() && /^\d+$/.test(dir)) {
            // Eğer versiyon dosyası varsa oku, yoksa varsayılan versiyon ata
            const versionPath = path.join(dirPath, 'version.txt');
            if (fs.existsSync(versionPath)) {
                projectVersions[dir] = fs.readFileSync(versionPath, 'utf8').trim();
            } else {
                projectVersions[dir] = '1.0.0';
                fs.writeFileSync(versionPath, '1.0.0');
            }
        }
    });
}

// Başlangıçta projeleri yükle
initializeProjectVersions();

// Proje listesini döndüren endpoint
app.get("/projects", (req, res) => {
    const publicPath = path.join(__dirname, 'public');
    try {
        const dirs = fs.readdirSync(publicPath);
        const projects = dirs
            .filter(dir => fs.statSync(path.join(publicPath, dir)).isDirectory() && /^\d+$/.test(dir))
            .map(dir => ({
                id: dir,
                version: projectVersions[dir] || '1.0.0'
            }));
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Proje listesi alınamadı' });
    }
});

// Belirli bir projenin içeriğini döndüren endpoint
app.get("/content/:projectId", (req, res) => {
    const projectId = req.params.projectId;
    const projectPath = path.join(__dirname, 'public', projectId);
    const dataPath = path.join(projectPath, 'data.json');

    if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Proje bulunamadı' });
    }

    try {
        let data = {};
        if (fs.existsSync(dataPath)) {
            data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        }

        res.json({
            version: projectVersions[projectId] || '1.0.0',
            data: data
        });
    } catch (error) {
        res.status(500).json({ error: 'Proje içeriği alınamadı' });
    }
});

// Versiyon bilgisini döndüren endpoint
app.get("/version/:projectId", (req, res) => {
    const projectId = req.params.projectId;
    if (!projectVersions[projectId]) {
        return res.status(404).json({ error: 'Proje bulunamadı' });
    }
    res.json({ version: projectVersions[projectId] });
});

// Manuel versiyon güncelleme endpoint'i
app.post("/manual-update/:projectId", (req, res) => {
    const projectId = req.params.projectId;
    const projectPath = path.join(__dirname, 'public', projectId);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Proje bulunamadı' });
    }

    const newVersion = `1.0.${Math.floor(Math.random() * 100)}`;
    projectVersions[projectId] = newVersion;
    
    // Versiyon bilgisini dosyaya kaydet
    const versionPath = path.join(projectPath, 'version.txt');
    fs.writeFileSync(versionPath, newVersion);
    
    console.log(`Proje ${projectId} için yeni versiyon manuel olarak güncellendi: ${newVersion}`);
    res.json({ success: true, version: newVersion });
});

// Versiyon güncelleme endpoint'i
app.post("/update-version/:projectId", (req, res) => {
    const projectId = req.params.projectId;
    const projectPath = path.join(__dirname, 'public', projectId);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Proje bulunamadı' });
    }

    const newVersion = `1.0.${Math.floor(Math.random() * 100)}`;
    projectVersions[projectId] = newVersion;
    
    // Versiyon bilgisini dosyaya kaydet
    const versionPath = path.join(projectPath, 'version.txt');
    fs.writeFileSync(versionPath, newVersion);
    
    console.log(`Proje ${projectId} için yeni versiyon: ${newVersion}`);
    res.json({ success: true, version: newVersion });
});

// Dosya indirme endpoint'i
app.get("/download/:filename(*)", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public', filename);

    // Dosyanın varlığını kontrol et
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    try {
        // Dosya bilgilerini al
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const extension = path.extname(filename).toLowerCase();

        // Content-Type belirleme
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
        };

        const contentType = mimeTypes[extension] || 'application/octet-stream';

        // Response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
        
        // Dosyayı stream olarak gönder
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Dosya indirme hatası:', error);
        res.status(500).json({ error: 'Dosya indirilemedi' });
    }
});

// Public klasöründeki dosyaları listeleyen endpoint
app.get("/files", (req, res) => {
    const publicPath = path.join(__dirname, 'public');
    
    try {
        // Recursive olarak tüm dosyaları bul
        function getFiles(dir) {
            const files = fs.readdirSync(dir);
            let fileList = [];
            
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                const relativePath = path.relative(publicPath, filePath);
                
                if (stat.isDirectory()) {
                    // Alt klasörleri de tara
                    fileList = fileList.concat(getFiles(filePath));
                } else {
                    // Dosya bilgilerini ekle
                    fileList.push({
                        name: file,
                        path: relativePath.replace(/\\/g, '/'),
                        size: stat.size,
                        lastModified: stat.mtime,
                        type: path.extname(file).substring(1)
                    });
                }
            });
            
            return fileList;
        }

        const files = getFiles(publicPath);
        res.json({
            version: projectVersions['default'] || '1.0.0',
            files: files
        });
    } catch (error) {
        console.error('Dosya listesi alınamadı:', error);
        res.status(500).json({ error: 'Dosya listesi alınamadı' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
