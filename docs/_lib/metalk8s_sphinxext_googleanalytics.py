# Based on the original sphinxcontrib.googleanalytics, see
# https://github.com/sphinx-contrib/googleanalytics/blob/b0ee38b542ed5cd748fc640d27ab60383ac3e02c/sphinxcontrib/googleanalytics.py

import unittest

import sphinx.errors

def ga_string(ua_id):
    return '\n'.join([
        "<!-- Google Analytics -->",
        "<script>",
        "window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;",
        "ga('create', '{ua_id}', 'auto');".format(ua_id=ua_id),
        "ga('send', 'pageview');",
        "</script>",
        "<script async src='https://www.google-analytics.com/analytics.js'></script>",
        "<!-- End Google Analytics -->",
    ])

def add_ga_javascript(app, pagename, templatename, context, doctree):
    if not app.config.googleanalytics_enabled:
        return

    metatags = context.get('metatags', '')
    metatags += ga_string(app.config.googleanalytics_id)

    context['metatags'] = metatags

def check_config(app):
    if app.config.googleanalytics_enabled and not app.config.googleanalytics_id:
        raise sphinx.errors.ExtensionError(
            "'googleanalytics_id' config value must be set for GA statistics "
            "to function properly.")

def setup(app):
    app.add_config_value('googleanalytics_id', '', 'html')
    app.add_config_value('googleanalytics_enabled', True, 'html')

    app.connect('html-page-context', add_ga_javascript)
    app.connect('builder-inited', check_config)

    return {
        'version': '0.1',
    }


if __name__ == '__main__':
    import unittest

    class TestExtension(unittest.TestCase):
        def test_ga_string(self):
            code = ga_string('UA-XXXXX-Y')
            # From https://developers.google.com/analytics/devguides/collection/analyticsjs/
            expected = r'''
<!-- Google Analytics -->
<script>
window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
ga('create', 'UA-XXXXX-Y', 'auto');
ga('send', 'pageview');
</script>
<script async src='https://www.google-analytics.com/analytics.js'></script>
<!-- End Google Analytics -->
'''.strip()

            self.assertEqual(code, expected)

        def test_ga_string_ua_id(self):
            code = ga_string('UA-12345-67')

            self.assertIn('UA-12345-67', code)

    unittest.main()
