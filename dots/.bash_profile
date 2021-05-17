insert()
{
    n=$1
    np=$(echo $n)
    p=$2
    if [ -d "$p" ]; then
        eval $n=$p:$(eval echo '$'$np) 
    fi
}

# set PATH so it includes user's private bin if it exists
insert PATH "$HOME/bin"
insert PATH "$HOME/local/bin"
insert PATH "$HOME/.local/bin"
insert PATH "$HOME/dotfiles/bin"
if which lsb_release 1>/dev/null 2>&1; then
    case "$(lsb_release -is)" in
        Ubuntu|Raspbian|Debian) insert PATH "$HOME/dotfiles/ubuntu/bin" ;;
        Arch*) insert PATH "$HOME/dotfiles/arch/bin" ;;
    esac
else
    insert PATH "$HOME/dotfiles/arch/bin"
fi
case ${OSTYPE} in
    darwin*)
        insert PATH "$HOME/mac/bin"
        insert PATH "$HOME/nvim-osx64/bin" ;;
esac
insert PATH "$HOME/$(hostname)/bin"
insert PATH "/opt/bin"
insert PATH "/usr/local/texlive/2015/bin/x86_64-linux"
insert PATH "$HOME/.gem/ruby/2.5.0/bin"
insert PATH "$HOME/.gem/ruby/2.6.0/bin"
insert PATH "$HOME/.password-store/bin"
insert PATH "$HOME/.cargo/bin"
insert PATH "$HOME/.rbenv/bin"
insert PATH "$HOME/.fzf/bin"
insert PATH "$HOME/.npm/bin"
insert PATH "$HOME/.local/bin"
insert PATH "$HOME/.local/redpen/bin"
insert PATH "$HOME/.local/share/miniconda3/bin"
insert PATH "$HOME/Applications/VSCode-linux-x64/bin"
if [ -d "$HOME/go" ]; then
    export GOPATH="$HOME/go"
    insert PATH "$GOPATH/bin"
fi
insert PATH "/usr/local/go/bin"

export MAILDIR="$HOME/Mail"
if [ -d "$HOME/.npm" ]; then
    export NPM_PACKAGES="$HOME/.npm"
    insert PATH "$NPM_PACKAGES/bin"
fi

insert LD_LIBRARY_PATH "$HOME/local/lib64"

if [ -d "$HOME/dotfiles" ]; then
    #git
    if [[ "`git --version`" =~ ^git\ version\ 2.*$ ]]; then
        ln -sf "$HOME/dotfiles/.gitconfig" "$HOME/.gitconfig"
    else
        cat "$HOME/dotfiles/.gitconfig" | \
            grep -v 'default\s=\ssimple' > \
            "$HOME/.gitconfig.legacy"
        ln -sf "$HOME/.gitconfig.legacy" "$HOME/.gitconfig"
    fi
    # for server
    if [ "$SSH_CONNECTION" ]; then
        cp $HOME/dotfiles/.gitconfig $HOME/.gitconfig.server
        ln -sf $HOME/.gitconfig.server $HOME/.gitconfig
        git config --global credential.helper "cache --timeout 1209600" # 2 weeks
    fi
fi

# fcitx on X11 Forwarding
#which fcitx 1>/dev/null 2>&1
#if [ $? -eq 0 -a "${DISPLAY//:.*/}" -a ! "$(pgrep fcitx)" ]; then
#    fcitx
#fi

(
if [ -e "$HOME/.keychain/$(hostname)-sh" ]; then
    rm $HOME/.keychain/$(hostname)-sh
fi
) 1>/dev/null 2>&1

which nvim 1>/dev/null 2>&1 && export EDITOR=nvim
export KCODE=u
export AUTOFEATURE=true
export XDG_CONFIG_HOME=$HOME/.config
export VTE_CJK_WIDTH=1

# shellcheck
export SHELLCHECK_OPTS="-e SC2002 -e SC2016"

# wiki
export WIKI_LANG="ja"

export GPG_TTY=$(tty)

export LESS="-x4"
export QT_QPA_PLATFORMTHEME='gtk2'

# AUR helper command
export AURHELPER=yay

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

