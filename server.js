const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Criar pasta uploads
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.use(cors());
app.use(express.json());

// 🔧 Servir arquivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 🔧 Rota principal (caso index não esteja no /public)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Upload config
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const nomeLimpo = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
        cb(null, Date.now() + '-' + nomeLimpo);
    }
});

const upload = multer({ storage });

// Banco SQLite
const db = new sqlite3.Database('./banco.db');

db.run(`
CREATE TABLE IF NOT EXISTS arquivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    caminho TEXT,
    autor TEXT,
    materia TEXT
)
`);

// Upload
app.post('/upload', upload.single('file'), (req, res) => {
    const { autor, materia } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ erro: "Arquivo não enviado" });
    }

    db.run(
        `INSERT INTO arquivos (nome, caminho, autor, materia)
         VALUES (?, ?, ?, ?)`,
        [file.originalname, file.path, autor, materia],
        function(err){
            if(err) return res.status(500).send(err);
            res.json({ sucesso: true });
        }
    );
});

// Listar
app.get('/arquivos', (req, res) => {
    db.all(`SELECT * FROM arquivos`, [], (err, rows) => {
        if (err) return res.status(500).send(err);

        const dados = rows.map(a => ({
            ...a,
            caminho: a.caminho.replace(/\\/g, "/")
        }));

        res.json(dados);
    });
});

// Deletar
app.delete('/arquivos/:id', (req, res) => {
    const id = req.params.id;

    db.get(`SELECT * FROM arquivos WHERE id=?`, [id], (err, row) => {
        if (err) return res.status(500).send(err);

        if (row) {
            if (fs.existsSync(row.caminho)) {
                fs.unlinkSync(row.caminho);
            }

            db.run(`DELETE FROM arquivos WHERE id=?`, [id]);
            res.json({ sucesso: true });
        } else {
            res.status(404).json({ erro: "Arquivo não encontrado" });
        }
    });
});

// 🔥 PORTA DINÂMICA (ESSENCIAL PARA RENDER)
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});