# Changelog

## [1.2.1](https://github.com/comnam90/vdc-vault-readiness/compare/v1.2.0...v1.2.1) (2026-02-18)


### Bug Fixes

* **ci:** trigger publish on release event instead of tag push ([fd75a7e](https://github.com/comnam90/vdc-vault-readiness/commit/fd75a7e3fb7eccd485c1f89d3557a7404b9ef5bc))

## [1.2.0](https://github.com/comnam90/vdc-vault-readiness/compare/v1.1.0...v1.2.0) (2026-02-18)


### Features

* **dashboard:** add experimental site banner ([#18](https://github.com/comnam90/vdc-vault-readiness/issues/18)) ([cefb64c](https://github.com/comnam90/vdc-vault-readiness/commit/cefb64c578070e2e587591d0c38518da4eee5d61))
* **ui:** add site footer with version and GitHub link ([#20](https://github.com/comnam90/vdc-vault-readiness/issues/20)) ([593542e](https://github.com/comnam90/vdc-vault-readiness/commit/593542e2198717c96a97f6db52ab9a1632899d89))
* **ui:** apply design polish refinements ([#22](https://github.com/comnam90/vdc-vault-readiness/issues/22)) ([74ac3ef](https://github.com/comnam90/vdc-vault-readiness/commit/74ac3efc82cccdd95fd272820b8fc5d55b42ef3a))

## [1.1.0](https://github.com/comnam90/vdc-vault-readiness/compare/v1.0.0...v1.1.0) (2026-02-15)


### Features

* add VDC Vault Calculator sizing inputs tab ([#14](https://github.com/comnam90/vdc-vault-readiness/issues/14)) ([14f4714](https://github.com/comnam90/vdc-vault-readiness/commit/14f4714837ee1d5e23180ee4b560a31ad06b4b04))
* **dashboard:** add job details smart columns and detail sheet ([#15](https://github.com/comnam90/vdc-vault-readiness/issues/15)) ([7e0dbe5](https://github.com/comnam90/vdc-vault-readiness/commit/7e0dbe57747773a79e80c9e4789024dab130d5d3))
* **dashboard:** show passing checks below blockers in overview ([#12](https://github.com/comnam90/vdc-vault-readiness/issues/12)) ([c9466da](https://github.com/comnam90/vdc-vault-readiness/commit/c9466da260f3b86f965338c1864663b5198aa847))
* **lib:** add SOBR analysis with capacity tier validation ([#16](https://github.com/comnam90/vdc-vault-readiness/issues/16)) ([c397e3f](https://github.com/comnam90/vdc-vault-readiness/commit/c397e3f860990770aee8137f58516b9afaa40875))
* **theme:** setup Geist font and Veeam 2025 brand CSS variables ([#7](https://github.com/comnam90/vdc-vault-readiness/issues/7)) ([3f0a18a](https://github.com/comnam90/vdc-vault-readiness/commit/3f0a18ad996f19b1335421f8d177adfd9121897f))
* **ui:** Phase 3 - Motion & Interaction polish ([#10](https://github.com/comnam90/vdc-vault-readiness/issues/10)) ([bfd2c29](https://github.com/comnam90/vdc-vault-readiness/commit/bfd2c2910308f3bccde054f42f3896c857c806a6))
* **ui:** polish dashboard components with Precision Engineering aesthetic ([#9](https://github.com/comnam90/vdc-vault-readiness/issues/9)) ([9d26924](https://github.com/comnam90/vdc-vault-readiness/commit/9d269245c2d207aaa8b27c5f71a328b0ad38e9fa))

## 1.0.0 (2026-02-07)


### ⚠ BREAKING CHANGES

* None - initial scaffolding

### Features

* **normalizer:** ensure validation only sees complete, typed healthcheck data ([8df6e1f](https://github.com/comnam90/vdc-vault-readiness/commit/8df6e1f225610fd76a5ae6bf5637a34b95d41bd2))
* **parser:** add zipSection parser utility ([#1](https://github.com/comnam90/vdc-vault-readiness/issues/1)) ([4ad9ba0](https://github.com/comnam90/vdc-vault-readiness/commit/4ad9ba052b70252dc0a7b90bb9c6aa0b75aa9ba0))
* **pipeline:** add orchestration function and integration tests ([#2](https://github.com/comnam90/vdc-vault-readiness/issues/2)) ([ae9fe5a](https://github.com/comnam90/vdc-vault-readiness/commit/ae9fe5a3912361031135dcb05063d7cf468f53ff))
* scaffold React 19 + Vite 7.3 + TypeScript project ([7ca1c31](https://github.com/comnam90/vdc-vault-readiness/commit/7ca1c31ecc2de298f0506788e009ecbe8b669760))
* **types:** add healthcheck section interfaces ([d67094c](https://github.com/comnam90/vdc-vault-readiness/commit/d67094c28e25699b73601edaefd6b0fc8bd57671))
* **types:** allow info validation status ([392c136](https://github.com/comnam90/vdc-vault-readiness/commit/392c13602e4a2dcc68ab20555341efbeaa51abd4))
* **ui:** add complete dashboard UI with file upload, analysis pipeline, and job explorer ([#3](https://github.com/comnam90/vdc-vault-readiness/issues/3)) ([4320d68](https://github.com/comnam90/vdc-vault-readiness/commit/4320d6829feb1eccda4ce40488856b205eafa36d))
* **validation:** add version comparison utility ([d7d5214](https://github.com/comnam90/vdc-vault-readiness/commit/d7d5214f6989e5997343db9da03692076e75f23c))
* **validation:** define ValidationResult output types ([c0cd1e8](https://github.com/comnam90/vdc-vault-readiness/commit/c0cd1e831041affe1358cb39031752510e0ed192))
* **validation:** flag community/free editions for SOBR limits ([ab88b62](https://github.com/comnam90/vdc-vault-readiness/commit/ab88b6284a49e63f4e0c7e1cf499f5dc3f5186c6))
* **validation:** implement validation engine with 5 rules ([2102520](https://github.com/comnam90/vdc-vault-readiness/commit/21025207151bfbbdb1d9a64dbdf6179bb87de0ea))


### Bug Fixes

* **normalizer:** allow missing sections to default ([d830147](https://github.com/comnam90/vdc-vault-readiness/commit/d83014724b747ef0c3c6750c95204146305bcd43))
* **normalizer:** guard non-array sections ([67f6789](https://github.com/comnam90/vdc-vault-readiness/commit/67f67894b3987b95b779d0de27a65d0420cef62b))
* **normalizer:** guard null/undefined array elements ([3e15572](https://github.com/comnam90/vdc-vault-readiness/commit/3e155723c26daf173786955a29f6cf1b83222c73))
