# Changelog

## [1.1.2](https://github.com/chrischall/easytable-mcp/compare/v1.1.1...v1.1.2) (2026-09-23)


### Bug Fixes

* **deps:** require zod ^4.6.5 to match @chrischall/mcp-utils 2.4.0 ([#89](https://github.com/chrischall/easytable-mcp/issues/89)) ([20d5319](https://github.com/chrischall/easytable-mcp/commit/20d5319392776acdb451a643ca575ef1a17a502d))
* **deps:** upgrade @chrischall/mcp-utils to 2.4.0 and @fetchproxy/* to 3.2.0 ([#87](https://github.com/chrischall/easytable-mcp/issues/87)) ([720d1fa](https://github.com/chrischall/easytable-mcp/commit/720d1fa3dfd90ba4f3c78790b7220750555eb913))

## [1.1.1](https://github.com/chrischall/easytable-mcp/compare/v1.1.0...v1.1.1) (2026-09-21)


### Bug Fixes

* **tools:** say that all three booking writes are destructive ([#85](https://github.com/chrischall/easytable-mcp/issues/85)) ([6e8ec07](https://github.com/chrischall/easytable-mcp/commit/6e8ec077269ddbe960f8eda95e4d841596f7a894))

## [1.1.0](https://github.com/chrischall/easytable-mcp/compare/v1.0.0...v1.1.0) (2026-09-19)


### Features

* **deps:** take mcp-utils 1.0.0, fixing server/discover ([#83](https://github.com/chrischall/easytable-mcp/issues/83)) ([1757084](https://github.com/chrischall/easytable-mcp/commit/175708415c168c1261e5c783ee4c5678cb29cbe7))

## [1.0.0](https://github.com/chrischall/easytable-mcp/compare/v0.4.4...v1.0.0) (2026-09-17)


### ⚠ BREAKING CHANGES

* **mcp:** migrate server to SDK v2 ([#79](https://github.com/chrischall/easytable-mcp/issues/79))

### Features

* **mcp:** migrate server to SDK v2 ([#79](https://github.com/chrischall/easytable-mcp/issues/79)) ([fedf084](https://github.com/chrischall/easytable-mcp/commit/fedf084f29116e12c0dca6e6d8b881b0b02fa0b7))


### Bug Fixes

* **build:** preserve Zod initialization in standalone bundle ([#81](https://github.com/chrischall/easytable-mcp/issues/81)) ([537d9c8](https://github.com/chrischall/easytable-mcp/commit/537d9c852dcacb0b6e0b266c8d9268d1e0a1bb33))
* **deps:** Bump the production-dependencies group with 3 updates ([#77](https://github.com/chrischall/easytable-mcp/issues/77)) ([c76af71](https://github.com/chrischall/easytable-mcp/commit/c76af71060347714ee0bee398c80f7f0221f7141))
* **mcp:** verify SDK v2 tool schema ([#82](https://github.com/chrischall/easytable-mcp/issues/82)) ([4d5ebdf](https://github.com/chrischall/easytable-mcp/commit/4d5ebdf64e626eb88a0764d4b0a33e219a7f7d72))

## [0.4.4](https://github.com/chrischall/easytable-mcp/compare/v0.4.3...v0.4.4) (2026-09-15)


### Bug Fixes

* **deps:** @fetchproxy/server 3.0.1 — capped peer frames, logged load drops, atomic identity writes ([#73](https://github.com/chrischall/easytable-mcp/issues/73)) ([7c67da9](https://github.com/chrischall/easytable-mcp/commit/7c67da982483d8977b5c490c3c4307e9faa0f1a7))

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
