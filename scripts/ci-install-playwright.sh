#!/usr/bin/env bash
# CI 用: Playwright のブラウザとシステム依存をインストールする。
#
#   scripts/ci-install-playwright.sh chromium
#   scripts/ci-install-playwright.sh firefox webkit
#
# `playwright install --with-deps` は 1 回の失敗でジョブごと落ち、apt の既定タイムアウトのせいで
# Ubuntu のミラーに届かないと 1 時間近く待たされることがある。そこで:
# - ブラウザ本体（Playwright の CDN から取得、actions/cache でキャッシュ）は再試行し、失敗したらエラー
# - システム依存（apt）は短いタイムアウトで再試行し、それでも失敗したら警告だけ出して続行する。
#   ランナーのイメージにはほとんどの依存が入っているので、足りなければブラウザ起動でテストが失敗する
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <browser>..." >&2
  exit 2
fi

PLAYWRIGHT="${PLAYWRIGHT:-pnpm exec playwright}"
ATTEMPTS="${ATTEMPTS:-3}"
RETRY_DELAY="${RETRY_DELAY:-15}"
DEPS_TIMEOUT="${DEPS_TIMEOUT:-600}"

# 失敗したら RETRY_DELAY, 2×RETRY_DELAY, … 秒待って再試行
retry() {
  local n=1 delay="$RETRY_DELAY"
  until "$@"; do
    if [ "$n" -ge "$ATTEMPTS" ]; then
      return 1
    fi
    echo "::warning::'$*' failed (attempt $n/$ATTEMPTS), retrying in ${delay}s"
    sleep "$delay"
    n=$((n + 1))
    delay=$((delay * 2))
  done
}

# apt が届かないミラーで長く待たないよう、タイムアウトと再試行回数を短くする
if [ -d /etc/apt/apt.conf.d ] && command -v sudo >/dev/null 2>&1; then
  printf '%s\n' \
    'Acquire::Retries "2";' \
    'Acquire::http::Timeout "15";' \
    'Acquire::https::Timeout "15";' |
    sudo tee /etc/apt/apt.conf.d/99ci-timeouts >/dev/null || true
fi

# shellcheck disable=SC2086 # PLAYWRIGHT は "pnpm exec playwright" のように分割して使う
if ! retry timeout "$DEPS_TIMEOUT" $PLAYWRIGHT install-deps "$@"; then
  echo "::warning::Could not install system dependencies for $* (apt mirrors unreachable?). Continuing with the packages already on the runner; browser launch will fail in the tests if something essential is missing."
fi

# shellcheck disable=SC2086
if ! retry $PLAYWRIGHT install "$@"; then
  echo "::error::Could not download Playwright browsers: $*"
  exit 1
fi
