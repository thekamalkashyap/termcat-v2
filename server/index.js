import uws from "uWebSockets.js";
import { StringDecoder } from "string_decoder";
const decoder = new StringDecoder("utf8");

const users = new Map();
const wss = new Map();

const handleConnect = ({ uid, ws, name, connect, offer }) => {
  users.set(uid, { ws, name });
  wss.set(ws, { uid, name });
  const data = {
    type: "connected",
    uid: uid,
  };
  ws.send(JSON.stringify(data));
  if (connect) {
    const otherWs = users.get(connect)?.ws;
    if (!otherWs) {
      ws.send(JSON.stringify({ type: "error", message: "User not found" }));
      return;
    }
    ws.send(JSON.stringify({ type: "joined", connect }));
    otherWs.send(JSON.stringify({ type: "joined", connect: uid, offer }));
  }
};

const handleMessage = ({ message, receiver, ws }) => {
  const data = {
    type: "message",
    message: message,
    sender: wss.get(ws)?.name,
  };
  const otherWs = users.get(receiver)?.ws;
  if (!otherWs) {
    ws.send(JSON.stringify({ type: "error", message: "User not found" }));
    return;
  }
  otherWs.send(JSON.stringify(data));
};

const handleCandidate = ({ candidate, receiver, ws }) => {
  const data = {
    type: "candidate",
    candidate: candidate,
  };
  const otherWs = users.get(receiver)?.ws;
  if (!otherWs) {
    ws.send(JSON.stringify({ type: "error", message: "User not found" }));
    return;
  }
  otherWs.send(JSON.stringify(data));
};

const handleExit = ({ receiver, ws }) => {
  const data = {
    type: "exit",
  };
  const otherWs = users.get(receiver)?.ws;
  if (!otherWs) {
    ws.send(JSON.stringify({ type: "error", message: "User not found" }));
    return;
  }
  otherWs.send(JSON.stringify(data));
};

uws
  .App()
  .ws("/*", {
    message: (ws, data, isBinary) => {
      const json = JSON.parse(decoder.write(Buffer.from(data)));
      const { type, uid, name, message, candidate, connect, offer, receiver } =
        json;
      switch (type) {
        case "connect":
          handleConnect({ uid, ws, name, connect, offer });
          break;
        case "message":
          handleMessage({ message, receiver, ws });
          break;
        case "candidate":
          handleCandidate({ candidate, receiver, ws });
          break;
        case "exit":
          handleExit({ receiver, ws });
          break;
      }
    },
    close: (ws, code, message) => {
      const uid = wss.get(ws)?.uid;
      wss.delete(ws);
      users.delete(uid);
    },
  })
  .any("/*", (res, req) => {
    res.end("Nothing to see here!");
  })
  .listen(3000, (listenSocket) => {
    console.log("Listening to port 3000");
  });
