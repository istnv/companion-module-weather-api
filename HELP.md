## WeatherAPI.com  <img src='https://cdn.weatherapi.com/v4/images/weatherapi_logo.png' alt="Weather data by WeatherAPI.com" border="0"></a>

Retrieve and display weather information. Powered by <a href="https://www.weatherapi.com/" title="Free Weather API">WeatherAPI.com</a><br>
This module requires an active internet connection and you will need your own API key from [WeatherAPI.com](https://www.weatherapi.com/).<br>


## Configuration
**Setting** | **Description**
-----------------|---------------
**API Key** | Enter your API Key from WeatherAPI
**Location** | Enter the weather location <sup>**</sup>
**Metric** | Select to display Celsius & kPH, otherwise Fahrenheit & MPH

## Available Actions/commands
**Command** | **Description**
---|---
**Refresh** | Refresh weather information. To prevent API abuse, there is a one minute delay before allowing another refresh.

## Feedback
&nbsp; | **Description**
---|---
**Graphic** |  WeatherAPI graphic for current weather

## Variables
Replace `wapi` with the actual instance name.

**Variable** | **Description**
---|---
*Location* | &nbsp;
`$(wapi:l_name)` | Name
`$(wapi:l_region)` | Region or State (if available)
`$(wapi:l_country)` | Country
`$(wapi:l_localtime)` | Local Time
*Current Information* | &nbsp;
`$(wapi:c_time)` | Time last updated
`$(wapi:c_temp)` | Temperature<sup>*</sup>
`$(wapi:c_feels)` | Feels like<sup>*</sup>
`$(wapi:c_text)` | Condition description
`$(wapi:c_wind)` | Wind speed
`$(wapi:c_windir)` | Wind direction

---
<sup>*</sup> Temperature variables include the degree (°) symbol

---
<sup>**</sup> You can enter one of the following for the weather location

**Description** | **Example**
---|---
Latitude and Longitude (Decimal degree) | 48.8567,2.3508
City name | Paris
US zip | 10001
UK postcode | SW1
Canada postal code | G2J
metar:<metar code> | metar:EGLL
iata:<3 digit airport code> | iata:DXB
IP address (IPv4 and IPv6 supported) | 100.0.0.1
