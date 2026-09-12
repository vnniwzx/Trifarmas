# Trifarmas — versão Vercel (funções serverless + Turso)

Esta é a versão do Trifarmas adaptada para rodar na **Vercel**. A diferença
em relação à versão anterior (pasta `trifarmas-app`, que era um servidor
Node.js tradicional): aqui, cada rota da API virou uma **função
serverless** separada (é assim que a Vercel funciona), e o banco de dados
trocou de SQLite local para o **Turso** — um banco na nuvem que fala a
mesma linguagem do SQLite, então quase nada mudou na estrutura das
tabelas ou nas consultas.

## Por que precisou mudar o banco de dados

Na Vercel, cada função serverless roda isolada e o disco é apagado a
cada execução — então um arquivo `.sqlite` local não sobrevive entre uma
requisição e outra. O Turso resolve isso: é um banco SQLite hospedado,
acessado pela internet, então todas as funções (não importa onde rodem)
enxergam os mesmos dados.

## Passo a passo para colocar no ar

### 1. Crie uma conta gratuita no Turso

1. Acesse **[turso.tech](https://turso.tech)** e crie uma conta (dá pra
   entrar direto com GitHub).
2. Instale a CLI deles ou use o painel web para criar um banco novo —
   no painel, o botão costuma ser "Create Database". Dê um nome, ex:
   `trifarmas`.
3. Depois de criado, você vai precisar de duas informações:
   - A **URL do banco** (algo como `libsql://trifarmas-seunome.turso.io`)
   - Um **Auth Token** (crie um em "Create Token" dentro do banco)

Guarde essas duas informações — você vai usá-las no próximo passo.

### 2. Suba o projeto para o GitHub

A Vercel importa direto de um repositório Git. Crie um repositório novo
no GitHub e suba esta pasta (`trifarmas-vercel`) inteira para lá.

### 3. Importe na Vercel

1. Acesse **[vercel.com](https://vercel.com)**, crie uma conta (dá pra
   entrar com GitHub também) e clique em **"Add New" → "Project"**.
2. Selecione o repositório que você acabou de criar.
3. Antes de clicar em "Deploy", abra a seção **"Environment Variables"**
   e adicione as duas variáveis que você guardou do Turso:

   | Nome | Valor |
   |---|---|
   | `TURSO_DATABASE_URL` | a URL do seu banco (começa com `libsql://`) |
   | `TURSO_AUTH_TOKEN` | o token que você criou |

4. Clique em **Deploy**. Em 1 ou 2 minutinhos o site está no ar, com uma
   URL tipo `https://seu-projeto.vercel.app`.

Na primeira vez que alguém acessar o site (ou você mesmo, criando uma
conta), o próprio backend cria as tabelas no Turso automaticamente e
popula com as farmácias/remédios/recompensas de exemplo — não precisa
rodar nenhum comando de setup manual.

## Testando localmente antes de publicar (recomendado)

Antes de mexer na Vercel, dá pra conferir que toda a lógica das rotas
está funcionando, sem precisar nem de conta no Turso nem na Vercel:

```bash
node test_local.js
```

Esse script simula exatamente como a Vercel chama as funções, mas usa um
banco SQLite local temporário por baixo dos panos (o `node:sqlite`
nativo do Node) só para fins de teste. Ele roda mais de 20 verificações:
cadastro, login, busca de remédio, criação de pedido, evolução do status
ao longo do tempo, confirmação de retirada com crédito de pontos,
lembretes, resgate de recompensa etc. Se todos os `✅` aparecerem, a
lógica está correta — falta só a parte de hospedagem em si.

> Isso é diferente de rodar `vercel dev` (que emula a infraestrutura da
> Vercel de verdade, incluindo o roteamento das funções). Se você tiver a
> CLI da Vercel instalada (`npm i -g vercel`) e quiser testar de um jeito
> ainda mais fiel ao ambiente real antes de publicar, pode rodar
> `vercel dev` com um arquivo `.env` (copie o `.env.example`) preenchido
> com as credenciais do Turso.

## O que eu consegui testar de verdade, e o que não consegui

Sendo honesto sobre os limites: eu não tenho acesso à internet no
ambiente onde trabalho, então não consegui criar uma conta Turso de
verdade nem publicar isso na Vercel para testar ao vivo.

O que eu **testei e confirmei que funciona** (rodando aqui mesmo,
`node test_local.js`): toda a lógica de negócio de cada rota — as
consultas SQL, as regras (senha com hash, pedido só dá pontos quando
confirmado, saldo insuficiente barra o resgate, etc.) — usando a mesma
biblioteca de interface que o Turso usa, só que apontando pro SQLite
local em vez do Turso remoto.

O que eu **não pude testar**: a conexão de verdade com o Turso pela
internet, e o comportamento exato da Vercel rodando essas funções em
produção (roteamento das pastas `[id]`, variáveis de ambiente, etc). Eu
escrevi esse código seguindo a documentação oficial de ambos com todo o
cuidado, mas se algo específico da infraestrutura deles se comportar de
um jeito inesperado, pode ser que apareça algum ajuste pontual a fazer
depois do primeiro deploy — me manda o erro que aparecer (print da tela
ou da aba "Deployments" → "Logs" na Vercel) que eu resolvo com você.

## Estrutura do projeto

```
trifarmas-vercel/
├── index.html, styles.css, app.js   → front-end (idêntico ao de antes)
├── schema.sql                        → estrutura das tabelas (SQLite/Turso)
├── lib/
│   ├── db.js                          → conexão com o Turso + criação/seed automática das tabelas
│   └── auth.js                        → hash de senha, sessões, helpers compartilhados
├── api/                               → uma função serverless por rota
│   ├── auth/{signup,login,logout}.js
│   ├── me.js
│   ├── pharmacies.js
│   ├── medicines.js
│   ├── orders/{index.js, [id]/confirm-pickup.js}
│   ├── reminders/{index.js, [id].js}
│   └── rewards/{index.js, [id]/redeem.js}
├── test_local.js                     → bateria de testes (roda sem precisar de Turso/Vercel)
├── .env.example
└── package.json                      → só uma dependência: @libsql/client (cliente do Turso)
```

## Se der erro depois de publicar

- **"Faltam as variáveis de ambiente TURSO_DATABASE_URL..."** → você
  esqueceu de configurar as variáveis de ambiente no painel da Vercel
  (Project → Settings → Environment Variables), ou digitou o nome errado.
  Depois de adicionar, é preciso fazer um novo deploy (Vercel → aba
  "Deployments" → "..." → "Redeploy").
- **Erro 500 em alguma rota específica** → veja os logs em Vercel →
  seu projeto → aba "Logs" (ou "Runtime Logs"), vai mostrar a mensagem de
  erro exata.
- **Front-end carrega mas nada funciona** → abra o Console do navegador
  (F12) e veja se aparece algum erro de rede — me manda o print.
