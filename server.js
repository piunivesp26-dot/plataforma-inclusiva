const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();

// Criar pasta uploads
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Upload config
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const nomeLimpo = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
        cb(null, Date.now() + '-' + nomeLimpo);
    }
});

const upload = multer({ storage });

// Banco
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
        if(row){
            fs.unlinkSync(row.caminho);
            db.run(`DELETE FROM arquivos WHERE id=?`, [id]);
            res.json({ sucesso: true });
        }
    });
});

app.listen(3001, () => {
    console.log("Servidor rodando em http://localhost:3001");
});