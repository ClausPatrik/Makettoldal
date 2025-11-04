const express = require('express'); const path = require('path'); const app = express(); const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname));
app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.get('/login', (req,res)=>res.sendFile(path.join(__dirname,'login.html')));
app.use((req,res)=>res.status(404).sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, ()=>console.log(`✅ Server running: http://localhost:${PORT}`));