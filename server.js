import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Gerenciamento de Salas em memória
const salas = {};

function gerarCodigo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 5; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

io.on('connection', (socket) => {
  console.log(`[+] Conectado: ${socket.id}`);

  // 1. Criar Sala (Host)
  socket.on('CRIAR_SALA', (jogadorData) => {
    let codigo = gerarCodigo();
    while (salas[codigo]) codigo = gerarCodigo();

    salas[codigo] = {
      codigo: codigo,
      hostId: socket.id,
      jogadores: [
        {
          id: socket.id,
          nome: jogadorData.nome,
          foto: jogadorData.foto,
          isHost: true
        }
      ]
    };

    socket.join(codigo);
    socket.salaAtual = codigo;

    socket.emit('SALA_CRIADA', {
      codigo: codigo,
      jogadores: salas[codigo].jogadores
    });
  });

  // 2. Entrar na Sala
  socket.on('ENTRAR_SALA', ({ codigo, jogadorData }) => {
    const codUpper = codigo.toUpperCase();
    const sala = salas[codUpper];

    if (!sala) {
      socket.emit('ERRO_SALA', 'Sala não encontrada!');
      return;
    }

    if (sala.jogadores.length >= 4) { // Limite de jogadores por sala
      socket.emit('ERRO_SALA', 'A sala está cheia!');
      return;
    }

    const novoJogador = {
      id: socket.id,
      nome: jogadorData.nome,
      foto: jogadorData.foto,
      isHost: false
    };

    sala.jogadores.push(novoJogador);
    socket.join(codUpper);
    socket.salaAtual = codUpper;

    // Avisa todos os participantes da sala sobre o novo jogador
    io.to(codUpper).emit('ATUALIZAR_JOGADORES', sala.jogadores);
  });

  // 3. Iniciar Partida
  socket.on('INICIAR_PARTIDA', () => {
    const sala = salas[socket.salaAtual];
    if (sala && sala.hostId === socket.id) {
      io.to(socket.salaAtual).emit('PARTIDA_INICIADA');
    }
  });

  // 4. Desconexão
  socket.on('disconnect', () => {
    const cod = socket.salaAtual;
    if (cod && salas[cod]) {
      salas[cod].jogadores = salas[cod].jogadores.filter(p => p.id !== socket.id);
      
      if (salas[cod].jogadores.length === 0) {
        delete salas[cod];
      } else {
        // Se o Host saiu, define o próximo jogador como Host
        if (salas[cod].hostId === socket.id) {
          salas[cod].hostId = salas[cod].jogadores[0].id;
          salas[cod].jogadores[0].isHost = true;
        }
        io.to(cod).emit('ATUALIZAR_JOGADORES', salas[cod].jogadores);
      }
    }
    console.log(`[-] Desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
