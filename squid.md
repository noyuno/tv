## Squidサーバの構築

### スペック

- /mnt/data/squid に最大5GBキャッシュ
- キャッシュする最大サイズは300MB

### インストール

~~~
sudo yum install -y squid
~~~

 /etc/squid/squid.conf
~~~
cache_dir ufs /mnt/data/squid 5000 16 256
maximum_object_size 300 MB

request_header_access Referer deny all
request_header_access X-Forwarded-For deny all
request_header_access Via deny all
request_header_access Cache-Control deny all

forwarded_for off
~~~

~~~
sudo mkdir /mnt/data/squid
sudo chown -R squid:squid $_
sudo firewall-cmd --add-service=squid --permanent
sudo firewall-cmd --reload
sudo systemctl start squid
sudo systemctl status squid
sudo systemctl enable squid
~~~

### チェック

~~~
squidclient -h localhost -p 3128 mgr:client_list      
sudo tail -f /var/log/squid/access.log
~~~

