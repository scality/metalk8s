"""Unstructured module for re-usable helpers in commands and mixins."""

# ANSI escape codes {{{
ANSI_ESCAPE_CODES = {
    'reset': '\x1b[0m',
    'decoration': {
        'bold':      '\x1b[1m',
        'underline': '\x1b[4m',
        'reversed':  '\x1b[7m',
    },
    'color': {
        'black':   '\x1b[30m',
        'red':     '\x1b[31m',
        'green':   '\x1b[32m',
        'yellow':  '\x1b[33m',
        'blue':    '\x1b[34m',
        'magenta': '\x1b[35m',
        'cyan':    '\x1b[36m',
        'white':   '\x1b[37m',
    },
    'background_color': {
        'black':   '\x1b[40m',
        'red':     '\x1b[41m',
        'green':   '\x1b[42m',
        'yellow':  '\x1b[43m',
        'blue':    '\x1b[44m',
        'magenta': '\x1b[45m',
        'cyan':    '\x1b[46m',
        'white':   '\x1b[47m',
    },
}


def format_ansi(msg, color=None, bg_color=None, decoration=None, reset=True):
    prefixes = []
    if color is not None:
        prefixes.append(ANSI_ESCAPE_CODES['color'][color])
    if bg_color is not None:
        prefixes.append(ANSI_ESCAPE_CODES['background_color'][bg_color])
    if decoration is not None:
        prefixes.append(ANSI_ESCAPE_CODES['decoration'][decoration])

    if prefixes:
        return '{prefix}{msg}{suffix}'.format(
            prefix=''.join(prefixes),
            msg=msg,
            suffix=ANSI_ESCAPE_CODES['reset'] if reset else '',
        )

    return msg


# }}}
