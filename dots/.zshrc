# ------------------------------
# General Settings
# ------------------------------

if [ "$TERM" = linux ]; then
    export LANG=C
else
    [ "$TMUX" ] && export TERM=screen-256color
fi 

bindkey -e
bindkey "\e[3~" delete-char
# zsh home, end
bindkey "\e[H" beginning-of-line
bindkey "\e[F" end-of-line
# tmux home, end
bindkey "\e[1~" beginning-of-line
bindkey "\e[4~" end-of-line
# M-home, M-end
bindkey "\e[1;3D" beginning-of-line
bindkey "\e[1;3C" end-of-line

setopt nonomatch
setopt no_beep
setopt auto_cd
setopt auto_pushd
setopt correct
setopt magic_equal_subst
setopt prompt_subst
setopt notify
setopt equals
setopt interactivecomments
#setopt no_rm_star_silent # silent rm *

### Complement ###
setopt auto_list
setopt auto_menu
setopt list_packed
setopt list_types
bindkey "^[[Z" reverse-menu-complete
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'

### Glob ###
setopt extended_glob
unsetopt caseglob

### History ###
HISTFILE=~/.zsh_history
HISTSIZE=10000
SAVEHIST=10000
setopt bang_hist
setopt extended_history
setopt hist_ignore_dups
setopt share_history
setopt hist_reduce_blanks
setopt rm_star_silent

autoload history-search-end
zle -N history-beginning-search-backward-end history-search-end
zle -N history-beginning-search-forward-end history-search-end
bindkey "^P" history-beginning-search-backward-end
bindkey "^O" history-beginning-search-backward-end
bindkey "^N" history-beginning-search-forward-end

function history-all { history -E 1 }


# ------------------------------
# Look And Feel Settings
# ------------------------------
### Ls Color ###
export LSCOLORS=Exfxcxdxbxegedabagacad
export LS_COLORS='di=01;34:ln=01;35:so=01;32:ex=01;31:bd=46;34:cd=43;34:su=41;30:sg=46;30:tw=42;30:ow=43;30'
# ZLS_COLORS
export ZLS_COLORS=$LS_COLORS
export CLICOLOR=true
zstyle ':completion:*:default' menu select=1

### Prompt ###
export DISABLE_AUTO_TITLE="false"
autoload -U colors; colors
autoload -Uz vcs_info; setopt prompt_subst

gitv=$(git --version|awk '/git/{print $3}'|awk -F. '{print $1}')
zstyle ':vcs_info:git:*' stagedstr "%F{green}s"
zstyle ':vcs_info:git:*' unstagedstr "%F{green}u"
zstyle ':vcs_info:*' formats "%F{green}%c%u"
zstyle ':vcs_info:*' actionformats '[%b|%a]'
if [ $gitv -ge 2 ]; then
    zstyle ':vcs_info:git:*' check-for-changes true
fi

precmd(){
    ret="$?"
    [ "$ret" -eq 0 ] && ret=
    vcs_info
}
PROMPT="[%F{green}${USER}@${HOST%%.*} %F{blue}%~%f] %(!.#.$) "
PROMPT2="%{${fg[cyan]}%}%_> %{${reset_color}%}"
RPROMPT='${ret}${vcs_info_msg_0_}'
RPROMPT_ORIG="$RPROMPT"
SPROMPT="%{${fg[yellow]}%}possibly '%r'? [yNea]:%{${reset_color}%}"
[ -n "${REMOTEHOST}${SSH_CONNECTION}" ] &&
  PROMPT="[%F{green}${USER}%F{yellow}@${HOST%%.*}%F{blue} %~%f] %(!.#.$) "
;

# ------------------------------
# Other Settings
# ------------------------------
### RVM ###
if [[ -s ~/.rvm/scripts/rvm ]] ; then source ~/.rvm/scripts/rvm ; fi

[ -f "$HOME/.zsh_aliases" ] && . $HOME/.zsh_aliases

function dirc() {
    cnormal="\e[32m"
    chidden="\x1b[38;05;8m"
    cfiles="\e[m"
    cdirs="\e[34m"
    ctotal="\e[m"
    creset="\e[m"

    list=$(ls -aFU1)
    total=$(echo "$list" | wc -l)
    files=$(echo "$list" | command grep -v /)
    filescount=$(echo "$files" | command wc -l)
    fileshiddencount=$(echo "$files" | command grep '^\.' | command wc -l)
    filesnormalcount=$((filescount - fileshiddencount))
    dirs=$(echo "$list" | command grep /)
    dirscount=$(echo "$dirs" | command wc -l)
    dirshiddencount=$(echo "$dirs" | command grep '^\.' | command wc -l)
    dirsnormalcount=$((dirscount - dirshiddencount))
    normal=$((filesnormalcount + dirsnormalcount))
    hidden=$((fileshiddencount + dirshiddencount))
    echo -ne "$cfiles$filescount$creset($cnormal$filesnormalcount $chidden$fileshiddencount$creset) \
    $cdirs$dirscount$creset($cnormal$dirsnormalcount $chidden$dirshiddencount$creset) \
    $ctotal$total$creset($cnormal$normal $chidden$hidden$creset) "
    command ls -al . | awk '{ total += $5 }; END { printf("%dMB\n", int(total/1024/1024)) }'
}

function cdls() {
    if [ $(ls -U1 | wc -l) -lt 50 ]; then
        if which exa >/dev/null 2>&1; then
            exa --color=always
        else
            case $OSTYPE in
                linux*) ls --color=always ;;
                darwin*) ls -G ;;
            esac
        fi
    fi
    if [ "$TMUX" ]; then
        tmux refresh-client -S
    fi
}
function cd() {
    builtin cd $@ && dirc && cdls
}

zstyle ':completion:*' auto-description 'specify: %d'
zstyle ':completion:*' completer _expand _complete _correct _approximate
zstyle ':completion:*' format 'Completing %d'
zstyle ':completion:*' group-name ''
zstyle ':completion:*' menu select=2
which dircolors 1>/dev/null 2>&1 && eval "$(dircolors -b)"
zstyle ':completion:*:default' list-colors ${(s.:.)LS_COLORS}
zstyle ':completion:*' list-colors ''
zstyle ':completion:*' list-prompt %SAt %p: Hit TAB for more, or the character to insert%s
zstyle ':completion:*' matcher-list '' 'm:{a-z}={A-Z}' 'm:{a-zA-Z}={A-Za-z}' 'r:|[._-]=* r:|=* l:|=*'

zstyle ':completion:*' menu select=long
zstyle ':completion:*' select-prompt %SScrolling active: current selection at %p%s
zstyle ':completion:*' use-compctl false
zstyle ':completion:*' verbose true

zstyle ':completion:*:*:kill:*:processes' list-colors '=(#b) #([0-9]#)*=0=01;31'
zstyle ':completion:*:kill:*' command 'ps -u $USER -o pid,%cpu,tty,cputime,cmd'

case "${OSTYPE}" in
linux*)
    zsh_version_is_5="0"
    if [[ "`zsh --version`" =~ ^zsh\ 5.*$ ]]; then
        zsh_version_is_5="1"
        # antigen
        if [ ! -e ~/.cache/antigen ]; then
            mkdir -p ~/.cache
            git clone https://github.com/zsh-users/antigen.git ~/.cache/antigen --depth 1
        fi
        source ~/.cache/antigen/antigen.zsh

        if which antigen 1>/dev/null 2>&1; then
            antigen bundle zsh-users/zsh-syntax-highlighting
            antigen bundle zsh-users/zsh-completions
            antigen bundle zsh-users/zsh-autosuggestions
            antigen apply
        fi
    fi
    ;;
esac

fpath=(~/dotfiles/zsh-completions $fpath)
plugins=(_ zsh-completions)
autoload -U compinit; compinit -u

if [ ~/dotfiles/.zshrc -nt ~/.zshrc.zwc ]; then
    zcompile ~/.zshrc 
fi 

[ "$zsh_version_is_5" = "1" ] && [ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# C-s
stty stop undef &&:

#ruby
which rbenv 1>/dev/null 2>&1 && eval "$(rbenv init -)"

# direnv
which direnv 1>/dev/null 2>&1 && eval "$(direnv hook zsh)"

# added by travis gem
[ -f /home/noyuno/.travis/travis.sh ] && source /home/noyuno/.travis/travis.sh

if [[ "$TERM" == "dumb" ]]; then
    unsetopt zle
    unsetopt prompt_cr
    unsetopt prompt_subst
    unfunction precmd
    unfunction preexec
    PS1='$ '
fi

