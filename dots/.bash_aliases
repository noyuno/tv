case ${OSTYPE} in
    linux*) 
        alias ls='ls --color -h -N'
        tstyle='--time-style=long-iso';;
    darwin*) alias ls='ls -Gh' ;;
esac
if which exa >/dev/null 2>&1; then
    alias ls='exa'
fi
alias l='ls -Fh'     #size,show type,human readable
alias la='ls -aFh'   #long list,show almost all,show type,human readable
alias lr='ls -tRFh'   #sorted by date,recursive,show type,human readable
alias lt='ls -ltFh '"$tstyle"   #long list,sorted by date,show type,human readable
alias ll='ls -lFh '"$tstyle" # show with long
alias lla='ls -halF '"$tstyle" # show all with long
alias ldot='ls -ld '"$tstyle"' .*' # show only dotfiles
alias lS='ls -1FS' # show size
alias lrt='ls -1Fcrt' # show order by ctime
alias lart='ls -1Fcart' # show all order by ctime
# show all recursively order by size
alias fs='ls -lah --time-style=long-iso $(find . -type f) | sort -h -k5 | grep -v "./.git"'

# less
alias less='less -asRix8'
# find/grep/ag
function find { command find "$@" -not -iwholename '*/.git/*' ; }
alias grep='grep --color=always'
alias grepc='find . -type f | xargs grep --color'
alias ff='find . -type f | grep --color'
alias sgrep='grep -R -n -H -C 5 --exclude-dir={.git,.svn,CVS} '

alias ag='ag -S'
alias agl='ag -S --stats --pager "less -R"'
alias agh='ag --hidden'
alias aglh='ag --hidden -S --stats --pager "less -R"'
alias an='ag --hidden -l'

alias t='tail -F'
alias mt='multitail'

# because typing 'cd' is A LOT of work!!
alias ..='cd ../'
alias ...='cd ../../'
alias ....='cd ../../../'
alias .....='cd ../../../../'
alias .1='cd ../'
alias .2='cd ../../'
alias .3='cd ../../../'
alias .4='cd ../../../../'
alias .5='cd ../../../../../'
alias .6='cd ../../../../../../'
alias cdr='cd $(git rev-parse --show-toplevel)'

# Command line head / tail shortcuts
if [ "$ZSH_VERSION" ]; then
    alias -g H='| head'
    alias -g T='| tail'
    alias -g G='| grep'
    alias -g L="| less"
    alias -g M="| most"
    alias -g LL="2>&1 | less"
    alias -g CA="2>&1 | cat -A"
    alias -g NE="2> /dev/null"
    alias -g NUL="> /dev/null 2>&1"
    alias -g P="2>&1| pygmentize -l pytb"
fi
lessr() { unbuffer $* | less -R; }

case ${OSTYPE} in
linux*)
    alias dud='du --max-depth 1 -h | sort -h'
    alias duf='du -sh *'
    alias duc='du -b | sort -n | numfmt --to=iec --suffix=B --padding=5'
    alias dus='du --max-depth 1 -m | sort -n'
    ;;
darwin*)
    alias dud='du -d 1 -k | sort -n'
    ;;
esac

alias fd='find . -type d -name'
alias ff='find . -type f -name'

alias h='history'
alias hr='history 1 | awk "{print \$2}" | sort | uniq -c | sort -nr | head | sort'
alias hgrep="fc -El 0 | grep"
alias help='man'
alias js='jobs'
alias p='ps -f'
alias sortnr='sort -n -r'
alias unexport='unset'

case ${OSTYPE} in
    linux*)
        alias rm='rm -I'
        alias cp='cp -i'
        alias mv='mv -i' ;;
    darwin*)
        alias rm='rm -i'
        alias cp='cp -i'
        alias mv='mv -i' ;;
esac

# zsh is able to auto-do some kungfoo
# depends on the SUFFIX :)
if [ "${ZSH_VERSION}" ]; then
    # open browser on urls
    _browser_fts=(htm html de org net com at cx nl se dk dk php)
    for ft in $_browser_fts ; do alias -s $ft=$BROWSER ; done

    _editor_fts=(cpp cxx cc c hh h inl asc txt TXT tex)
    for ft in $_editor_fts ; do alias -s $ft=$EDITOR ; done

    _image_fts=(jpg jpeg png gif mng tiff tif xpm)
    for ft in $_image_fts ; do alias -s $ft=$XIVIEWER; done

    _media_fts=(ape avi flv mkv mov mp3 mpeg mpg ogg ogm rm wav webm)
    for ft in $_media_fts ; do alias -s $ft=mplayer ; done

    #read documents
    alias -s pdf=acroread
    alias -s ps=gv
    alias -s dvi=xdvi
    alias -s chm=xchm
    alias -s djvu=djview

    #list whats inside packed file
    alias -s zip="unzip -l"
    alias -s rar="unrar l"
    alias -s tar="tar tf"
    alias -s tar.gz="echo "
    alias -s ace="unace l"
fi

# Make zsh know about hosts already accessed by SSH
if [ "$ZSH_VERSION" ]; then
    zstyle -e ':completion:*:(ssh|scp|sftp|rsh|rsync):hosts' hosts \
    'reply=(${=${${(f)"$(cat {/etc/ssh_,~/.ssh/known_}hosts(|2)(N) /dev/null)"}%%[# ]*}//,/ })'
fi

# tmux
alias tmux='tmux -2'
tm()
{
    case "$(hostname)" in
        lap*)   tmuxinator start laptop ;;
        *)    tmuxinator start main
    esac
}

#mount
alias mountiso='mount -t iso9660 -o loop'

#git
which hub 1>/dev/null 2>&1 && eval "$(hub alias -s)"

alias g='git'
alias gu='git pull'
if which tig 1>/dev/null 2>&1 ; then
    alias gs='tig status'
else
    alias gs='git status'
fi

gpush()
{
    [ -z "$*" ] && text="Update" || text="$*"
    branchname=$(git branch | grep --color=no '*.*' | sed -e 's/\*\ //')
    git add . && \
    git commit -m "$text" && \
    git push origin $branchname
}
ginit()
{
    [ ! -d ".git" ] && git init
    command cp "$HOME/dotfiles/.gitattributes" .
}

gilfs()
{
    [ ! -d ".git" ] && git init
    command cp "$HOME/dotfiles/.gitattributes.lfs" .gitattributes
}

alias pinst='pip3 install --user'

if [[ -x `which colordiff 2>/dev/null` ]]; then
    alias diff='colordiff -u'
else
    alias diff='diff -u'
fi

# urxvt
alias urxvt='xrdb ~/.Xresources; urxvt -e tmux'
alias rxvt='urxvt'
# xterm
alias uxterm='TERM=xterm-256color uxterm -e tmux -2'
alias xterm='uxterm'

# cron
if which crontab 1>/dev/null 2>&1; then
    if [ -f ~/dotfiles/.crontab ]; then
        crontabrc=~/dotfiles/.crontab
        if test -z $CRONTABCMD; then
            # allows to source zshrc twice
            export CRONTABCMD=$(which crontab)
            crontab()
            {
                if [[ $@ == "-e" ]]; then
                    $EDITOR $crontabrc && $CRONTABCMD $crontabrc
                else
                    $CRONTABCMD -i $@
                fi
            }
            $CRONTABCMD $crontabrc
        fi
    fi
fi

gcalcli() { [ $# -eq 0 ] && command gcalcli calw 4 || command gcalcli $@; }

# trans
alias trej='trans en:ja'
alias trje='trans ja:en'

alias restart-keyring='gnome-keyring-daemon -r -d'
alias susp='sudo true && mate-screensaver-command -l && sudo systemctl suspend'
alias sourceall='exec $SHELL -l'

# clipboard
alias ci='xsel -ib'
alias co='xsel -ob'

# clang
alias clang='clang -fcolor-diagnostics'
alias clang++='clang++ -fcolor-diagnostics'

# help
alias dfhelp="lessr markdown-cli $HOME/dotfiles/readme.md"

# Add an "alert" alias for long running commands.  Use like so:
#   sleep 10; alert
alias alert='notify-send --urgency=low -i \
    "$([ $? = 0 ] && echo terminal || echo error)" \
    "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'

# my ip
alias gip='curl -s ipinfo.io | jq ".ip" -r'
alias lip='hostname -I | cut -d " " -f 1'

# cdev fix
alias cdevfix='ssh cdev rm ".zsh_history*"'

# SHELLCHECK_OPTS does not work
alias shellcheck='command shellcheck -e 2002 -e 2016'

# multibyte wc
alias wcm='wc -lm'

# watch 'leap seconds'
alias leap='ntpq -c "lassoc" -c "mrv &1 &999 leap,srcadr,stratum"'

function ranger() {
    if [ -z "$RANGER_LEVEL" ]; then
        command ranger $@
    else
        exit
    fi
}
alias rr='ranger'

# RPROMPT
alias enrprompt='RPROMPT=$RPROMPT_ORIG'
alias disrprompt='RPROMPT='

#ipython
alias ipython='ipython --profile=default'

alias rs='rainbowstream -iot'

alias animea='anime -a -n $((LINES-2))'
alias icala='ical -a -n $((LINES-2))'

alias mozc-config='/usr/lib/mozc/mozc_tool --mode=config_dialog'

# for logitech keyboard
alias logicool='sudo localectl set-x11-keymap jp logicda'

# wiki
alias wiki='wiki -s'

# IntelliJ IDEA
alias ideainit='cp "$HOME/dotfiles/templates/intellij-idea.iml" "$(basename $PWD).iml"'

# sudo
alias s='sudo '

# open
alias xo='xdg-open'

# bc
_bb()
{
    echo "scale=2; $*" | bc -ql | sed -e 's/^\./0./'
}
alias bb='noglob _bb'

alias lock='mate-screensaver-command -l'

alias bc='bc -q'

alias mc="gpg2 --list-secret-keys|grep \< --color=no | sed -e 's/^.* <//' -e 's/>$//'|head -n 1 | xsel -ib"

gpgdfix()
{
    echo -n "Passphrase for $*: "
    read -s pass
    echo "$pass" | gpg -qd --passphrase-fd 0 $*
}

killgpga()
{
    gpgconf --kill gpg-agent
}

browsezero()
{
    a=$(avahi-browse -tkr "_http._tcp" -p | \
        grep '^=' --color=never | \
        grep 'IPv4' --color=never)
    i=$(echo $a | cut -d \; -f 7)
    p=$(echo $a | cut -d \; -f 9)
    
    for ((c=$(echo $i | grep . | wc -l); c > 0; c--)); do
        addr=$(echo $i | tail -n $c | head -n 1)
        port=$(echo $p | tail -n $c | head -n 1)
        xdg-open "http://$addr:$port/"
    done
}

alias rotate='mogrify -rotate 90'

csview()
{
    column -s, -t | less -\#4 -S
}

ej()
{
    fzf -q "^" +s <$HOME/.cache/gene/ej.txt
}

# https://github.com/junegunn/dotfiles/blob/c6959cd4f/bashrc
viw() {
    vim `command which "$1"`
}

gd() {
    [ "$1" ] && cd *$1*
}

gitzip() {
    git archive -o $(basename $PWD).zip HEAD
}

gittgz() {
    git archive -o $(basename $PWD).tar.gz HEAD
}

gitdiffb() {
    if [ $# -ne 2 ]; then
        echo two branch names required
        return
    fi
    git log --graph \
    --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr)%Creset' \
    --abbrev-commit --date=relative $1..$2
}

alias gitv='git log --graph --format="%C(auto)%h%d %s %C(black)%C(bold)%cr"'

re() {
    while [ -n "$2" ]; do
        eval "$2"
        sleep $1
    done
}

# fzf (https://github.com/junegunn/fzf)
# --------------------------------------------------------------------
# fd - cd to selected directory
fdd() {
    DIR=`find ${1:-*} -path '*/\.*' -prune -o -type d -print 2> /dev/null | fzf-tmux` && cd "$DIR"
}

# fda - including hidden directories
fda() {
    DIR=`find . -type d -name ".*" 2> /dev/null | sed 's|^./||' | fzf-tmux $*` && cd "$DIR"
}

# Figlet font selector
fgl() {
    cd /usr/local/Cellar/figlet/*/share/figlet/fonts
    BASE=`pwd`
    figlet -f `ls *.flf | sort | fzf` $*
}

# fbr - checkout git branch
fbr() {
    local branches branch
    branches=$(git branch --all | grep -v HEAD) &&
    branch=$(echo "$branches" |
            fzf-tmux -d $(( 2 + $(wc -l <<< "$branches") )) +m) &&
    git checkout $(echo "$branch" | sed "s/.* //" | sed "s#remotes/[^/]*/##")
}

# fco - checkout git branch/tag
fco() {
    local tags branches target
    tags=$(
        git tag | awk '{print "\x1b[31;1mtag\x1b[m\t" $1}') || return
    branches=$(
        git branch --all | grep -v HEAD             |
        sed "s/.* //"    | sed "s#remotes/[^/]*/##" |
        sort -u          | awk '{print "\x1b[34;1mbranch\x1b[m\t" $1}') || return
    target=$(
        (echo "$tags"; echo "$branches") |
        fzf-tmux -l30 -- --no-hscroll --ansi +m -d "\t" -n 2) || return
    git checkout $(echo "$target" | awk '{print $2}')
}

# fshow - git commit browser (enter for show, ctrl-d for diff, ` toggles sort)
fshow() {
    local out shas sha q k
    while out=$(
        git log --graph --color=always \
            --format="%C(auto)%h%d %s %C(black)%C(bold)%cr" "$@" |
        fzf --ansi --multi --no-sort --reverse --query="$q" --tiebreak=index \
            --print-query --expect=ctrl-d --toggle-sort=\`); do
        q=$(head -1 <<< "$out")
        k=$(head -2 <<< "$out" | tail -1)
        shas=$(sed '1,2d;s/^[^a-z0-9]*//;/^$/d' <<< "$out" | awk '{print $1}')
        [ -z "$shas" ] && continue
        if [ "$k" = 'ctrl-d' ]; then
        git diff --color=always $shas | less -R
        else
        for sha in $shas; do
            git show --color=always $sha | less -R
        done
        fi
    done
}

# ftags - search ctags
ftags() {
    local line
    [ -e tags ] &&
    line=$(
        awk 'BEGIN { FS="\t" } !/^!/ {print toupper($4)"\t"$1"\t"$2"\t"$3}' tags |
        cut -c1-80 | fzf --nth=1,2
    ) && $EDITOR $(cut -f3 <<< "$line") -c "set nocst" \
                                        -c "silent tag $(cut -f2 <<< "$line")"
}

# fe [FUZZY PATTERN] - Open the selected file with the default editor
#   - Bypass fuzzy finder if there's only one match (--select-1)
#   - Exit if there's no match (--exit-0)
fe() {
    local file
    file=$(fzf-tmux --query="$1" --select-1 --exit-0)
    [ -n "$file" ] && ${EDITOR:-vim} "$file"
}

# Modified version where you can press
#   - CTRL-O to open with `open` command,
#   - CTRL-E or Enter key to open with the $EDITOR
fo() {
    local out file key
    out=$(fzf-tmux --query="$1" --exit-0 --expect=ctrl-o,ctrl-e)
    key=$(head -1 <<< "$out")
    file=$(head -2 <<< "$out" | tail -1)
    if [ -n "$file" ]; then
        [ "$key" = ctrl-o ] && xdg-open "$file" || ${EDITOR:-vim} "$file"
    fi
}

if [ -n "$TMUX_PANE" ]; then
    fzf_tmux_helper() {
        local sz=$1;  shift
        local cmd=$1; shift
        tmux split-window $sz \
        "bash -c \"\$(tmux send-keys -t $TMUX_PANE \"\$(source ~/.fzf.bash; $cmd)\" $*)\""
    }

    # https://github.com/wellle/tmux-complete.vim
    fzf_tmux_words() {
        fzf_tmux_helper \
        '-p 40' \
        'tmuxwords.rb --all --scroll 500 --min 5 | fzf --multi | paste -sd" " -'
    }

    # ftpane - switch pane (@george-b)
    ftpane() {
        local panes current_window current_pane target target_window target_pane
        panes=$(tmux list-panes -s -F '#I:#P - #{pane_current_path} #{pane_current_command}')
        current_pane=$(tmux display-message -p '#I:#P')
        current_window=$(tmux display-message -p '#I')

        target=$(echo "$panes" | grep -v "$current_pane" | fzf +m --reverse) || return

        target_window=$(echo $target | awk 'BEGIN{FS=":|-"} {print$1}')
        target_pane=$(echo $target | awk 'BEGIN{FS=":|-"} {print$2}' | cut -c 1)

        if [[ $current_window -eq $target_window ]]; then
            tmux select-pane -t ${target_window}.${target_pane}
        else
            tmux select-pane -t ${target_window}.${target_pane} &&
            tmux select-window -t $target_window
        fi
    }

  # Bind CTRL-X-CTRL-T to tmuxwords.sh
#  bind '"\C-x\C-t": "$(fzf_tmux_words)\e\C-e"'

elif [ -d ~/github/iTerm2-Color-Schemes/ ]; then
    ftheme() {
        local base
        base=~/github/iTerm2-Color-Schemes
        $base/tools/preview.rb "$(
        ls {$base/schemes,~/.vim/plugged/seoul256.vim/iterm2}/*.itermcolors | fzf)"
    }
fi

## Switch tmux-sessions
tsw() {
  local session
  session=$(tmux list-sessions -F "#{session_name}" | \
    fzf-tmux --query="$1" --select-1 --exit-0) && \
  tmux switch-client -t "$session"
}

# RVM integration
frb() {
    local rb
    rb=$( (echo system; rvm list | grep ruby | cut -c 4-) | \
        awk '{print $1}' | \
        fzf-tmux -l 30 +m --reverse) && rvm use $rb
}

# Z integration
if [ -e $HOME/bin/z.sh ]; then
    source $HOME/bin/z.sh
    unalias z 2> /dev/null
    z() {
        if [[ -z "$*" ]]; then
            cd "$(_z -l 2>&1 | fzf-tmux +s --tac | sed 's/^[0-9,.]* *//')"
        else
            _z "$@"
        fi
    }
fi
# v - open files in ~/.viminfo
v() {
    local files
    files=$(grep '^>' ~/.viminfo | cut -c3- |
            while read line; do
                [ -f "${line/\~/$HOME}" ] && echo "$line"
            done | fzf-tmux -d -m -q "$*" -1) && vim ${files//\~/$HOME}
}

# c - browse chrome history
ch() {
    local cols sep
    cols=$(( COLUMNS / 3 ))
    sep='{::}'

    command rm -f "/tmp/chrome-history"
    if [ -f "$HOME/.config/google-chrome/Profile 1/History" ]; then
        command cp -f "$HOME/.config/google-chrome/Profile 1/History" /tmp/chrome-history
    else
        command cp -f "$HOME/.config/google-chrome/Default/History" /tmp/chrome-history
    fi

    sqlite3 -init /dev/null -separator $sep /tmp/chrome-history \
        "select substr(title, 1, $cols), url
        from urls order by last_visit_time desc" 2>/dev/null | \
    awk -F $sep 'NR!=1{printf "%-'$cols's  \x1b[36m%s\x1b[m\n", $1, $2}' | \
    fzf --ansi --multi --no-hscroll --tiebreak=begin >/tmp/chrome-history-select
    [ $? -eq 0 ] && sed 's#.*\(https*://\)#\1#' </tmp/chrome-history-select | \
    xargs google-chrome-stable
}

cb() {
    local cols sep
    cols=$(( COLUMNS / 3 ))

    command rm -f "/tmp/chrome-bookmarks"
    if [ -f "$HOME/.config/google-chrome/Profile 1/Bookmarks" ]; then
        command cp -f "$HOME/.config/google-chrome/Profile 1/Bookmarks" /tmp/chrome-bookmarks
    else
        command cp -f "$HOME/.config/google-chrome/Default/Bookmarks" /tmp/chrome-bookmarks
    fi

    jq -r '..|{"name":.name?,"url":.url?,"visited":.meta_info?.last_visited_desktop?}|select(.name!=null)|select(.url!=null)|select(.visited!=null)' \
        < /tmp/chrome-bookmarks > /tmp/chrome-bookmarks2
    jq -sr '.|sort_by(.visited)| reverse | .[] | "\(.name)\t\(.url)"' \
        < /tmp/chrome-bookmarks2 | \
        awk -F'\t' '
            NF==2 {
                printf("%s", $1"  \x1b[36m"$2"\x1b[m\n")
            }
        ' | \
    fzf --ansi --multi --no-hscroll --tiebreak=begin >/tmp/chrome-bookmarks-select
    [ $? -eq 0 ] && sed 's#.*\(https*://\|chrome://\)#\1#' </tmp/chrome-bookmarks-select | \
    xargs google-chrome-stable
}

if which nvim 1>/dev/null 2>&1 ; then
    # open multiple files by tab
    alias vi='nvim -p'
    alias vim='nvim -p'
    alias nvim='nvim -p'
fi

# atool
#alias au='aunpack'

# TeX
alias te='cat report.log | grep Error -A8 -n'

# ssh key
alias newid='ssh-keygen -t rsa && xsel -ib < ~/.ssh/id_rsa.pub'
alias copyid='xsel -ib < ~/.ssh/id_rsa.pub'

if which neomutt 1>/dev/null 2>&1 ; then
    alias mutt='neomutt'
fi

# pass
alias pc='pass -c'

# image minify
alias pngmin='pngquant -f --ext .png --speed 1'
alias jpgmin='jpegoptim -f -o -m90 -s'
pdfpng() {
    pdftoppm $1 -png -r 350 out
}

which drill >/dev/null 2>&1 && alias dig='drill'

which compdef 1>/dev/null 2>&1 && which pacman 1>/dev/null 2>&1 && compdef $AURHELPER=pacman
alias a="$AURHELPER"
alias ai="$AURHELPER --needed --noconfirm -S"
alias aid="$AURHELPER --asdeps --noconfirm --needed -S"
alias ar="$AURHELPER -Rs"
au()
{
    $AURHELPER -Syy
    $AURHELPER -Qu
    echo -n "last full upgrade: "
    grep "full system upgrade" </var/log/pacman.log|tail -n 1|awk -F] '{gsub("\\[","",$1);print $1}'
    #echo -n "type enter to upgrade: "
    #read
    $AURHELPER --needed -Su --noconfirm
}
alias ac="$AURHELPER -Sc"
alias ao="$AURHELPER -Qdt"
alias am="$AURHELPER -Qet"
alias as="$AURHELPER -Ss"
alias aku='sudo pacman-key --refresh-key'
alias aki='sudo pacman-key -r'
alias akg='gpg --keyserver http://pgp.mit.edu --recv-key'

#alias ssh='ssh -XC4'
alias ssh='ssh -A'

alias lmax='awk "{i=length(\$0); if(m<i){m=i; t=\$0} } END{print m\" \"t}"'
alias lsort='awk "{print length(\$0)\" \"\$0}"|sort -t" " -n'
#alias nl200='awk "{i=length(\$0); if(i>=200)print \$0\"^\"length(\$0)}"|sort -k2 -t^ -n'
#alias nl255='awk "{i=length(\$0); if(i>=255)print \$0\"^\"length(\$0)}"|sort -k2 -t^ -n'

# fix usbmuxd bug
alias charge='sudo systemctl start usbmuxd'

# fix vmware bug
vmwarefix()
{
    sudo modprobe vmmon
    sudo modprobe vmw_vmci
    sudo modprobe vmnet
    sudo vmware-networks --start
}

alias megurubot='echo "toot @megurubot update" | tootstream'
alias port='sudo netstat -luntp'
which unar 1>/dev/null 2>&1 && alias unzip='unar'
alias sy='sudo systemctl'
which docker-compose >/dev/null 2>&1 && alias dc='docker-compose'
which podman-compose >/dev/null 2>&1 && alias dc='podman-compose'

# get docker-compose container ip
dip () {
    i=$(docker inspect $(docker ps | grep $1 | awk '{print $1}'))
    echo "$i" | jq -r '.[].NetworkSettings.Networks.'$(basename $(pwd))'_default.IPAddress' | tr '\n' ','
    echo "$i" | jq -cr '.[].NetworkSettings.Ports|keys[0]' | tr '\n' ' '
}

alias dprune='docker system prune -fa --volumes'
