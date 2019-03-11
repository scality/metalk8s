def test_foo(host):
    assert host.run("whoami").stdout.strip()
