# Lumen

An interactive model of how cells make and spend energy. A membrane is drawn in cross-section above the cell's carbon network, drawn as a transit map, and both run on one kinetic model of the cell's chemistry, slowed so you can watch it. Pulse an enzyme and see where the push spreads and where it dies.

**[Open it](https://a9l.im/lumen)** · part of [a9l.im](https://a9l.im)

## Running locally

The project has no build step of its own; it loads the shared design system from
the parent site by absolute path. From a checkout of
[a9lim.github.io](https://github.com/a9lim/a9lim.github.io) with submodules:

    npm install && npm run build
    python3 -m http.server --directory dist 8000   # http://localhost:8000/lumen/

The engine's tests run headless with `node --test 'tests/*.test.mjs'`. [about.md](about.md) describes the model and its sources, and [AGENTS.md](AGENTS.md) is the guide to the code.

## License

Made by a9lim with Claude. [AGPL-3.0](LICENSE).
