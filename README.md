<div align="center">

<img src="public/icon-192.png" alt="" width="96" height="96" />

# Noughts & Crosses

**Tic Tac Toe powered by [Jev](https://typesafe.ai).**<br />

<img src="public/og.png" alt="A game of noughts and crosses on notebook paper" width="720" />

</div>

## How Jev plays

Each turn the server sends Jev the board and asks one question: what is the best next move? It picks
from the empty cells, so it can never play an occupied square.

## Run it

```sh
npm install
cp .env.example .env
npm run dev
```

## Deploy

Import the repo in [Vercel](https://vercel.com/new). The Vite preset is picked up automatically.

| Variable                 | What for                                                    |
| ------------------------ | ----------------------------------------------------------- |
| `TYPESAFE_API_KEY`       | Jev's API key (server only)                                 |
| `SITE_URL`               | Public URL for social cards. Only needed on a custom domain |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4. Off when unset                          |

## License

[MIT](LICENSE)
