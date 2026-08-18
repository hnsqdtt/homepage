#!/usr/bin/env bash
# 全新服务器一键初始化(design/07):装 Docker、swap、建目录、生成 .env、拉起服务。
# 用法:curl -fsSL https://raw.githubusercontent.com/hnsqdtt/homepage/main/scripts/server-setup.sh | bash
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/hnsqdtt/homepage/main"
DIR=/opt/homepage

if [ "$(id -u)" -ne 0 ]; then
  echo "请以 root 运行(或 sudo bash)"; exit 1
fi

echo "==> 1/5 安装 Docker(如未安装)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> 2/5 配置 1G swap 安全垫(如未配置)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
  echo 'vm.swappiness=10' >/etc/sysctl.d/99-swap.conf && sysctl --system >/dev/null
fi

echo "==> 3/5 部署目录 ${DIR}"
mkdir -p "${DIR}/data"
cd "${DIR}"
curl -fsSL -o compose.yml "${REPO_RAW}/compose.yml"
curl -fsSL -o Caddyfile "${REPO_RAW}/Caddyfile"

echo "==> 4/5 生成 .env"
if [ -f .env ]; then
  echo "    .env 已存在,跳过(如需重配请手动编辑)"
else
  # 通过 /dev/tty 读输入,兼容 curl | bash 场景
  read -rp "GitHub OAuth App Client ID(prod): " GH_ID </dev/tty
  read -rp "GitHub OAuth App Client Secret(prod): " GH_SECRET </dev/tty
  read -rp "管理员 GitHub 数字 ID: " ADMIN_ID </dev/tty
  read -rp "站点域名 [linlang.me]: " DOMAIN </dev/tty
  DOMAIN=${DOMAIN:-linlang.me}
  cat >.env <<EOF
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_GITHUB_ID=${GH_ID}
AUTH_GITHUB_SECRET=${GH_SECRET}
AUTH_URL=https://${DOMAIN}
ADMIN_GITHUB_ID=${ADMIN_ID}
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
EOF
  chmod 600 .env
fi

echo "==> 5/5 拉取镜像并启动"
docker compose pull
docker compose up -d

echo
echo "完成。验证:"
echo "  curl -s http://127.0.0.1/api/health   (本机应答 ok)"
echo "  浏览器打开 https://\$(域名)/admin → GitHub 登录 → 系统自检页全绿即部署成功"
echo "别忘了配置每日备份 cron(DEPLOY.md 第 7 节)。"
