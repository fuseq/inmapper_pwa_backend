const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public')); // Statik dosyalar için
app.use(express.json()); // JSON body parsing için

// Versiyon bilgisini yükle
function loadVersion() {
    const versionPath = path.join(__dirname, 'public', 'version.json');
    try {
        if (fs.existsSync(versionPath)) {
            return JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        }
    } catch (error) {
        console.error('Versiyon dosyası yüklenemedi:', error);
    }
    return { version: '1.0.0', lastUpdated: new Date().toISOString().split('T')[0] };
}

// Versiyon bilgisini kaydet
function saveVersion(versionInfo) {
    const versionPath = path.join(__dirname, 'public', 'version.json');
    try {
        fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
    } catch (error) {
        console.error('Versiyon dosyası kaydedilemedi:', error);
    }
}

let currentVersion = loadVersion();

// Versiyon bilgisini döndüren endpoint
app.get("/version", (req, res) => {
    res.json(currentVersion);
});

// Versiyon güncelleme endpoint'i
app.post("/update-version", (req, res) => {
    const version = currentVersion.version.split('.');
    const newPatch = parseInt(version[2] || '0') + 1;
    const newVersion = `${version[0]}.${version[1]}.${newPatch}`;
    
    currentVersion = {
        version: newVersion,
        lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    saveVersion(currentVersion);
    
    console.log(`Yeni versiyon: ${newVersion}`);
    res.json(currentVersion);
});

// Dosya listesini döndüren endpoint
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
                    // version.json dosyasını hariç tut
                    if (file !== 'version.json') {
                        fileList.push({
                            name: file,
                            path: relativePath.replace(/\\/g, '/'),
                            size: stat.size,
                            lastModified: stat.mtime,
                            type: path.extname(file).substring(1)
                        });
                    }
                }
            });
            
            return fileList;
        }

        const files = getFiles(publicPath);
        res.json({
            ...currentVersion,
            files: files
        });
    } catch (error) {
        console.error('Dosya listesi alınamadı:', error);
        res.status(500).json({ error: 'Dosya listesi alınamadı' });
    }
});

// Dosya indirme endpoint'i
app.get("/download/*", (req, res) => {
    const filePath = path.join(__dirname, 'public', req.params[0]);

    // Dosyanın varlığını kontrol et
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    try {
        // Dosya bilgilerini al
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const extension = path.extname(filePath).toLowerCase();

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
        
        // Cache kontrolü için headers
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 yıl
        res.setHeader('ETag', `"${currentVersion.version}"`);
        
        // Client'ın gönderdiği ETag ile karşılaştır
        const clientETag = req.headers['if-none-match'];
        if (clientETag === `"${currentVersion.version}"`) {
            return res.status(304).end(); // Not Modified
        }

        // Response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        
        // Dosyayı stream olarak gönder
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Dosya indirme hatası:', error);
        res.status(500).json({ error: 'Dosya indirilemedi' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
