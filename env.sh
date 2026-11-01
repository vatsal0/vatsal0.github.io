# Repo-local Node, like a Python venv. Usage: source env.sh
export PATH="$(cd "$(dirname "${BASH_SOURCE[0]:-${(%):-%x}}")" && pwd)/.node/bin:$PATH"
