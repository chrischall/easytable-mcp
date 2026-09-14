# Changelog

## [0.4.3](https://github.com/chrischall/easytable-mcp/compare/v0.4.2...v0.4.3) (2026-09-14)


### Bug Fixes

* **deps:** @fetchproxy/server 2.11.3, so the hosted extension pin persists ([#70](https://github.com/chrischall/easytable-mcp/issues/70)) ([b153e26](https://github.com/chrischall/easytable-mcp/commit/b153e26424d85f313fd7ae4fabc46a23d66f872b))
* **deps:** @fetchproxy/server 3.0.0 — protocol v4 (forward secrecy, AAD over the frame) ([#72](https://github.com/chrischall/easytable-mcp/issues/72)) ([b6aef55](https://github.com/chrischall/easytable-mcp/commit/b6aef5514c6d8fbd68366c7dd67416a29fb90c89))

## [0.4.2](https://github.com/chrischall/easytable-mcp/compare/v0.4.1...v0.4.2) (2026-09-10)


### Bug Fixes

* **deps:** @fetchproxy/server 2.10.0 and @chrischall/mcp-utils 0.26.1 ([#66](https://github.com/chrischall/easytable-mcp/issues/66)) ([4fcdc2a](https://github.com/chrischall/easytable-mcp/commit/4fcdc2afb102507b0d4c6c4969fabb98601f4d6b))
* **deps:** Bump node-html-parser in the production-dependencies group ([#69](https://github.com/chrischall/easytable-mcp/issues/69)) ([cdd5708](https://github.com/chrischall/easytable-mcp/commit/cdd57087e96e3ce041e0885f9a0c85494b791017))
* **deps:** declare the peer floors mcp-utils 0.26.1 requires ([#67](https://github.com/chrischall/easytable-mcp/issues/67)) ([a3e3839](https://github.com/chrischall/easytable-mcp/commit/a3e3839129c7ea844c96d3a57370579c1e02cc84))
* **deps:** take @fetchproxy/server 2.9.1 so a pairing prompt survives ([#64](https://github.com/chrischall/easytable-mcp/issues/64)) ([ceb310b](https://github.com/chrischall/easytable-mcp/commit/ceb310bcaf1c25abb3b9bd6f61fa00fe282037dd))

## [0.4.1](https://github.com/chrischall/easytable-mcp/compare/v0.4.0...v0.4.1) (2026-09-09)


### Bug Fixes

* **deps:** require @fetchproxy/server ^2.7.0, the first that reads FETCHPROXY_IDENTITY_DIR ([#62](https://github.com/chrischall/easytable-mcp/issues/62)) ([0d6367f](https://github.com/chrischall/easytable-mcp/commit/0d6367f0e6f5cf640854fc6c3f4f8ad3b2938676))

## [0.4.0](https://github.com/chrischall/easytable-mcp/compare/v0.3.0...v0.4.0) (2026-09-04)


### Features

* **tools:** minify every response — no formatting whitespace on any payload ([#54](https://github.com/chrischall/easytable-mcp/issues/54)) ([1a32b6c](https://github.com/chrischall/easytable-mcp/commit/1a32b6c43220ee08eab73b4b4a6d128a94a4d438))

## [0.3.0](https://github.com/chrischall/easytable-mcp/compare/v0.2.4...v0.3.0) (2026-08-29)


### Features

* **deps:** take @fetchproxy/server 2.2.0 so the concentrator can bind its sandbox address ([#40](https://github.com/chrischall/easytable-mcp/issues/40)) ([8ad675a](https://github.com/chrischall/easytable-mcp/commit/8ad675a31e47c0ea89685821a21f58ae642c26f5))

## [0.2.4](https://github.com/chrischall/easytable-mcp/compare/v0.2.3...v0.2.4) (2026-08-28)


### Bug Fixes

* **egress:** declare only the hosts the server process dials in mint.yaml ([#38](https://github.com/chrischall/easytable-mcp/issues/38)) ([28733b7](https://github.com/chrischall/easytable-mcp/commit/28733b7e647fc165940f3ec075394c79b88b6944))

## [0.2.3](https://github.com/chrischall/easytable-mcp/compare/v0.2.2...v0.2.3) (2026-08-06)


### Bug Fixes

* **deps:** move to @fetchproxy/server 2.0.0 for the v3 handshake ([#25](https://github.com/chrischall/easytable-mcp/issues/25)) ([defda6b](https://github.com/chrischall/easytable-mcp/commit/defda6bab00c2a532995066fa7e480e3cf8fc2f5))

## [0.2.2](https://github.com/chrischall/easytable-mcp/compare/v0.2.1...v0.2.2) (2026-07-30)


### Bug Fixes

* **deps:** bump @fetchproxy/* to 1.7.0 and @chrischall/mcp-utils to 0.14.0 ([#19](https://github.com/chrischall/easytable-mcp/issues/19)) ([a9f0383](https://github.com/chrischall/easytable-mcp/commit/a9f0383fa987c068033ba1174e6fb3751d75199d))

## [0.2.1](https://github.com/chrischall/easytable-mcp/compare/v0.2.0...v0.2.1) (2026-07-25)


### Bug Fixes

* **deps:** bump fast-uri out of the host-confusion advisories ([#15](https://github.com/chrischall/easytable-mcp/issues/15)) ([55f0549](https://github.com/chrischall/easytable-mcp/commit/55f054944d1a840c3df7c9b91ee48a789722e3aa))

## [0.2.0](https://github.com/chrischall/easytable-mcp/compare/v0.1.0...v0.2.0) (2026-07-13)


### Features

* **skill:** add easytable fpx access skill ([#9](https://github.com/chrischall/easytable-mcp/issues/9)) ([f0ed3c4](https://github.com/chrischall/easytable-mcp/commit/f0ed3c491ebc6b5908af412537144da2b717d76a))


### Refactor

* **skill:** move root SKILL.md into skills/, point plugin.json at ./skills/ ([#11](https://github.com/chrischall/easytable-mcp/issues/11)) ([ca2e1a5](https://github.com/chrischall/easytable-mcp/commit/ca2e1a5687d1e53288feaf9828944ea7033dc371))

## 0.1.0 (2026-07-09)


### Features

* implement availability + booking tools over the fetchproxy bridge ([#5](https://github.com/chrischall/easytable-mcp/issues/5)) ([185ad23](https://github.com/chrischall/easytable-mcp/commit/185ad23083cdc2bfef2fa6ff3db8d58711fda603))


### Bug Fixes

* address auto-review nits from PR [#5](https://github.com/chrischall/easytable-mcp/issues/5) ([#8](https://github.com/chrischall/easytable-mcp/issues/8)) ([2af144c](https://github.com/chrischall/easytable-mcp/commit/2af144cbbee4ff67122adee8776e3285ea155a88)), closes [#6](https://github.com/chrischall/easytable-mcp/issues/6)
