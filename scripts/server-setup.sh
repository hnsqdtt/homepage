#!/usr/bin/env bash
# 全新服务器一键初始化(design/07):装 Docker 与 Caddy、swap、建目录、生成 .env、拉起服务。
# 宿主机 Caddy 为整机 80/443 网关(可与其他服务共存),本站路由经 import 挂入。
# 用法:curl -fsSL https://raw.githubusercontent.com/hnsqdtt/homepage/main/scripts/server-setup.sh | bash
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/hnsqdtt/homepage/main"
DIR=/opt/homepage

if [ "$(id -u)" -ne 0 ]; then
  echo "请以 root 运行(或 sudo bash)"; exit 1
fi

echo "==> 1/6 安装 Docker(如未安装)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> 2/6 安装 Caddy 网关(如未安装)"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get update
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

echo "==> 3/6 配置 1G swap 安全垫(如未配置)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
  echo 'vm.swappiness=10' >/etc/sysctl.d/99-swap.conf && sysctl --system >/dev/null
fi

echo "==> 4/6 部署目录 ${DIR}"
mkdir -p "${DIR}/data"
# 镜像内 app 用户固定 uid/gid 999(Dockerfile),挂载目录属主先对齐,否则容器无写权限
chown -R 999:999 "${DIR}/data"
cd "${DIR}"
curl -fsSL -o compose.yml "${REPO_RAW}/compose.yml"
curl -fsSL -o Caddyfile "${REPO_RAW}/Caddyfile"
# 宿主机 Caddy import 本站路由段(幂等);validate 通过才 reload,不影响网关上其他站点
grep -qF "import ${DIR}/Caddyfile" /etc/caddy/Caddyfile 2>/dev/null \
  || echo "import ${DIR}/Caddyfile" >>/etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile >/dev/null
systemctl reload caddy

echo "==> 5/6 生成 .env"
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
WATCHTOWER_TOKEN=$(openssl rand -hex 24)
EOF
  chmod 600 .env
fi

echo "==> 6/6 拉取镜像并启动"
docker compose pull
docker compose up -d

echo
echo "完成。验证:"
echo "  curl -s http://127.0.0.1:3000/api/health   (本机应答 ok)"
echo "  浏览器打开 https://\$(域名)/admin → GitHub 登录 → 系统自检页全绿即部署成功"
echo "别忘了配置每日备份 cron(DEPLOY.md 第 7 节)。"
