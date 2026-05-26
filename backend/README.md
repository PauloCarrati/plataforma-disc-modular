# Backend — DISC Platform

Esta pasta está reservada para a futura API do servidor.

## Quando você precisar de sync real entre dispositivos

Hoje o sistema usa `localStorage` (dados ficam no navegador de quem
abriu). Para que testes de participantes externos apareçam no painel do
Super-Admin em tempo real, você precisará de um dos backends abaixo.

---

## Opção A — Node.js + Express + MongoDB Atlas (gratuito)

```
backend/
  server.js          ← API REST
  routes/results.js  ← POST /api/disc/results
  models/Result.js   ← Schema Mongoose
  .env               ← MONGO_URI, PORT
```

### Passos
1. `npm init -y && npm i express mongoose cors dotenv`
2. No `server.js`:
   ```js
   const express = require('express');
   const mongoose = require('mongoose');
   require('dotenv').config();
   const app = express();
   app.use(express.json());
   app.use(require('cors')());
   app.use('/api/disc', require('./routes/results'));
   mongoose.connect(process.env.MONGO_URI)
     .then(() => app.listen(process.env.PORT || 3000));
   ```
3. Em `routes/results.js`:
   ```js
   const router = require('express').Router();
   const Result = require('../models/Result');
   router.post('/results', async (req, res) => {
     await Result.create(req.body);
     res.json({ ok: true });
   });
   router.get('/results', async (req, res) => {
     res.json(await Result.find().sort({ _id: -1 }));
   });
   module.exports = router;
   ```
4. No `app.js` do frontend, descomente a **Opção A** em `CentralDB.push()`.
5. Faça deploy gratuito no [Railway](https://railway.app) ou [Render](https://render.com).

---

## Opção B — Firebase Firestore (Google, plano gratuito Spark)

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Ative o **Firestore** em modo de teste.
3. Adicione o SDK no `index.html` (antes dos seus scripts):
   ```html
   <script type="module">
     import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.x/firebase-app.js';
     import { getFirestore, collection, addDoc, getDocs }
       from 'https://www.gstatic.com/firebasejs/10.x/firebase-firestore.js';

     const firebaseApp = initializeApp({
       apiKey:    "SUA_API_KEY",
       projectId: "SEU_PROJECT_ID",
       // ... demais configs do console Firebase
     });
     window._firestore = getFirestore(firebaseApp);
   </script>
   ```
4. No `app.js`, descomente a **Opção B** em `CentralDB.push()`:
   ```js
   const { collection, addDoc } = await import('firebase/firestore');
   await addDoc(collection(window._firestore, 'disc_participants'), participant);
   ```
5. Para ler todos os resultados no Super-Admin, adicione em `CentralDB.getAll()`:
   ```js
   const snap = await getDocs(collection(window._firestore, 'disc_participants'));
   return snap.docs.map(d => d.data());
   ```

---

## Opção C — Supabase (PostgreSQL gerenciado, gratuito)

1. Crie projeto em [supabase.com](https://supabase.com).
2. Crie tabela `disc_participants` com as colunas do objeto `result`.
3. Use a REST API gerada automaticamente:
   ```js
   // POST — salvar resultado
   await fetch('https://SEU_PROJETO.supabase.co/rest/v1/disc_participants', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'apikey': 'SUA_ANON_KEY',
       'Authorization': 'Bearer SUA_ANON_KEY'
     },
     body: JSON.stringify(participant)
   });
   ```

---

## Estrutura recomendada para produção

```
disc-platform/
├── frontend/          ← todos os arquivos que você já tem
│   ├── index.html
│   ├── style.css
│   ├── disc-engine.js
│   ├── app.js
│   ├── auth.js
│   ├── dashboard.js
│   └── reports.js
├── backend/           ← esta pasta
│   ├── server.js
│   ├── routes/
│   ├── models/
│   └── README.md      ← este arquivo
└── assets/
    ├── imagens/
    ├── icones/
    └── fontes/
```
