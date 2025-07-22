
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();
const db = admin.firestore();

// Carrega as chaves VAPID do arquivo JSON
const vapidKeys = require("./vapid-keys.json");
webpush.setVapidDetails(
  "mailto:example@yourdomain.org",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const ALL_USERS = ["Coordenação A", "Coordenação D", "Coordenação R"];

// Função auxiliar para enviar notificações para um usuário específico
async function sendNotification(user, payload) {
    const subscriptions = [];
    const snapshot = await db.collection("users").doc(user).collection("subscriptions").get();
    snapshot.forEach(doc => {
        subscriptions.push(doc.data());
    });

    // Envia a notificação para cada subscrição encontrada
    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(sub, JSON.stringify(payload));
        } catch (error) {
            console.error("Error sending notification, unsubscribing", error);
            // TODO: Remover subscrições inválidas do banco de dados
        }
    }
}

// Gatilho para novas mensagens no chat geral
exports.onNewGeneralMessage = onDocumentCreated("messages/{messageId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data();
    const sender = message.sender;

    const payload = {
        title: `Nova Mensagem de ${sender}`,
        body: message.text || "Enviou um anexo",
        icon: "icons/icon-192x192.svg",
        data: { url: "/index.html?view=chat" }
    };

    const promises = ALL_USERS
        .filter(user => user !== sender)
        .map(user => sendNotification(user, payload));

    await Promise.all(promises);
});

// Gatilho para novas mensagens em chats privados
exports.onNewPrivateMessage = onDocumentCreated("private_chats/{chatId}/messages/{messageId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data();
    const sender = message.sender;
    const chatId = event.params.chatId;
    const participants = chatId.split('_');
    const recipient = participants.find(p => p !== sender);

    if (!recipient) return;

    const payload = {
        title: `Mensagem Privada de ${sender}`,
        body: message.text || "Enviou um anexo",
        icon: "icons/icon-192x192.svg",
        data: { url: `/index.html?view=chat&partner=${sender}` }
    };

    await sendNotification(recipient, payload);
});

// Gatilho para novas tarefas
exports.onNewTask = onDocumentCreated("tasks/{taskId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const task = snap.data();
    const creator = task.createdBy;

    const payload = {
        title: "Nova Tarefa Criada",
        body: task.description,
        icon: "icons/icon-192x192.svg",
        data: { url: "/index.html?view=tasks" }
    };

    const promises = ALL_USERS
        .filter(user => user !== creator)
        .map(user => sendNotification(user, payload));

    await Promise.all(promises);
});

// Gatilho para quando uma tarefa é atualizada (ex: concluída)
exports.onTaskCompleted = onDocumentUpdated("tasks/{taskId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.completed === false && after.completed === true) {
        const completer = after.completedBy;
        const payload = {
            title: "Tarefa Concluída",
            body: `A tarefa "${after.description}" foi concluída por ${completer}.`,
            icon: "icons/icon-192x192.svg",
            data: { url: "/index.html?view=tasks" }
        };

        const promises = ALL_USERS
            .filter(user => user !== completer)
            .map(user => sendNotification(user, payload));

        await Promise.all(promises);
    }
});

// Gatilho para novos eventos na agenda
exports.onNewEvent = onDocumentCreated("agenda/{eventId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const eventData = snap.data();

    const payload = {
        title: "Novo Evento na Agenda",
        body: eventData.title,
        icon: "icons/icon-192x192.svg",
        data: { url: "/index.html?view=agenda" }
    };

    const promises = ALL_USERS.map(user => sendNotification(user, payload));
    await Promise.all(promises);
});
