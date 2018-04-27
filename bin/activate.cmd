:: DISCLAIMER: Might not work

docker run -ti --rm -v $(pwd):/workdir williamyeh/ansible:ubuntu16.04 ansible-playbook workdir/local_client.yml -i localhost, -c local -e system=windows
