#!/usr/bin/php
<?php

echo "Adding postupdate.txt ...\n";
file_put_contents('postupdate.txt', "this would have had to have come from the post-update script\n");

echo "Creating JS file ...\n";
file_put_contents('public/js/postupdate.js', "i guess it's possible!\n");

echo "[complete]\n";
