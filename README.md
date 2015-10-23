![alt tag](https://raw.github.com/NUDelta/dot2dot/master/img.png)

install
-------

1. meteor add dburles:google-maps
 
2. create settings.json that looks like this:

```
  {
      "public": {
          "googleAPIKey": "YOUR_API_KEY_HERE"
      }
  }
```

3. meteor run --settings settings.json 

4. meteor deploy APP_NAME --settings settings.json 


