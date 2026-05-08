import re, sys

conf_path = '/root/proxy/nginx.conf'

with open(conf_path, 'r') as f:
    content = f.read()

# Remove any existing pawreception block (broken or not)
content = re.sub(
    r'\n[ \t]*# [^\n]*pawreception[^\n]*\n.*',
    '',
    content,
    flags=re.DOTALL
).rstrip() + '\n'

server_block = '''
  # pawreception.com
  server {
    listen 443 ssl;
    server_name pawreception.com www.pawreception.com;

    ssl_certificate     /etc/letsencrypt/live/pawreception.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pawreception.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {
      proxy_pass         http://pawreception-web-1:3000;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection "upgrade";
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto https;
      proxy_read_timeout 120s;
    }
  }
'''

last_brace = content.rfind('\n}')
if last_brace == -1:
    print('ERROR: could not find closing } of http block')
    sys.exit(1)

content = content[:last_brace] + server_block + '}\n'

with open(conf_path, 'w') as f:
    f.write(content)

print('nginx.conf fixed successfully')
