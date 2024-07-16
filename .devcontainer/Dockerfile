FROM mcr.microsoft.com/devcontainers/base:jammy

RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
        acl \
        bash-completion \
        build-essential \
        curl \
        enchant-2 \
        gawk \
        gcc \
        genisoimage \
        git \
        isomd5sum \
        libassuan-dev \
        libbtrfs-dev \
        libdevmapper-dev \
        libgdbm-dev \
        libgpgme-dev \
        libncursesw5-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev \
        libssl-dev libbz2-dev libreadline-dev libsqlite3-dev \
        make \
        npm \
        pkg-config \
        plantuml \
        python3.10-gdbm \
        shellcheck \
        tk-dev \
        tmux \
        vim \
        xz-utils \
        zlib1g-dev \
        && \
    apt-get clean

USER vscode

# Install helm
ARG HELM_VERSION=3.14.4

RUN curl --fail -L -o /tmp/helm.tar.gz https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz && \
    sudo tar -zxvf /tmp/helm.tar.gz -C /usr/local/bin/ linux-amd64/helm --strip-components 1 && \
    rm -rf /tmp/helm.tar.gz

# Install go
ARG GO_VERSION=1.20.14

RUN curl --fail -L -o /tmp/go.tar.gz https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && \
    sudo tar -C /usr/local -xzf /tmp/go.tar.gz && \
    sudo ln -s /usr/local/go/bin/go /usr/local/bin/go && \
    sudo ln -s /usr/local/go/bin/gofmt /usr/local/bin/gofmt && \
    rm -rf /tmp/go.tar.gz

# Install golangci-lint
ARG GOLANGCI_VERSION=1.54.2

RUN curl --fail -L -o /tmp/install.sh https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh && \
    sudo bash /tmp/install.sh v${GOLANGCI_VERSION} && \
    rm -f /tmp/install.sh

# Install pyenv
RUN git clone https://github.com/pyenv/pyenv.git ~/.pyenv && \
    echo 'export PATH="$HOME/.pyenv/bin:$PATH"\nif command -v pyenv 1>/dev/null 2>&1; then\n eval "$(pyenv init -)"\nfi' | tee -a ~/.bashrc -a ~/.zshrc && \
    export PATH="$HOME/.pyenv/bin:$PATH" && eval "$(pyenv init -)"

# Install pythons
RUN ~/.pyenv/bin/pyenv install 3.10.12 3.6.15 2.7 && \
    ~/.pyenv/bin/pyenv global 3.10.12 3.6.15 2.7
    
# Install python libs
RUN ~/.pyenv/bin/pyenv exec pip install "tox~=4.4.12" "pre-commit~=3.3.3" "virtualenv<20.22.0" "esbonio>=0.12.0"

# Install crane
ARG CRANE_VERSION=0.20.0

RUN curl --fail -L -o /tmp/crane.tar.gz https://github.com/google/go-containerregistry/releases/download/v${CRANE_VERSION}/go-containerregistry_Linux_x86_64.tar.gz && \
    sudo tar -xzf /tmp/crane.tar.gz -C /usr/local/bin/ crane && \
    rm -rf /tmp/crane.tar.gz

# Install Skopeo from sources
ARG SKOPEO_VERSION=1.15.1

RUN curl --fail -L -o /tmp/skopeo.tar.gz https://github.com/containers/skopeo/archive/refs/tags/v${SKOPEO_VERSION}.tar.gz && \
    tar -zxvf /tmp/skopeo.tar.gz -C /tmp && \
    cd /tmp/skopeo-${SKOPEO_VERSION} && \
    sudo make bin/skopeo && \
    sudo mv bin/skopeo /usr/local/bin/ && \
    cd && \
    rm -rf /tmp/skopeo.tar.gz /tmp/skopeo-${SKOPEO_VERSION}
