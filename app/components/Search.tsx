/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import Typography from '@material-ui/core/Typography';
import MenuItem from '@material-ui/core/MenuItem';
import PictureIcon from '@material-ui/icons/Panorama';
import DocumentIcon from '@material-ui/icons/PictureAsPdf';
import NoteIcon from '@material-ui/icons/Note';
import AudioIcon from '@material-ui/icons/MusicVideo';
import VideoIcon from '@material-ui/icons/OndemandVideo';
import ArchiveIcon from '@material-ui/icons/Archive';
import FolderIcon from '@material-ui/icons/FolderOpen';
import UntaggedIcon from '@material-ui/icons/LabelOffOutlined';
import FileIcon from '@material-ui/icons/InsertDriveFileOutlined';
import ClearSearchIcon from '@material-ui/icons/Clear';
import BookmarkIcon from '@material-ui/icons/BookmarkBorder';
import BookIcon from '@material-ui/icons/LocalLibraryOutlined';
import PlaceIcon from '@material-ui/icons/Place';
import DateIcon from '@material-ui/icons/DateRange';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import IconButton from '@material-ui/core/IconButton';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import OpenLocationCode from 'open-location-code-typescript';
import { FormControlLabel, Switch } from '@material-ui/core';
import TagsSelect from './TagsSelect';
import CustomLogo from './CustomLogo';
import { actions as AppActions, getDirectoryPath } from '../reducers/app';
import {
  actions as LocationIndexActions,
  getIndexedEntriesCount,
  isIndexing,
  getSearchQuery
} from '../reducers/location-index';
import { getMaxSearchResults } from '../reducers/settings';
import styles from './SidePanels.css';
import i18n from '../services/i18n';
import { FileTypeGroups, SearchQuery } from '../services/search';
import { Pro } from '../pro';
import SearchMenu from './menus/SearchMenu';
import { Tag } from '../reducers/taglibrary';
import { formatDateTime, extractTimePeriod } from '../utils/dates';
import { isPlusCode, parseLatLon } from '../utils/misc';
import PlatformIO from '../services/platform-io';

interface Props {
  classes: any;
  style: any;
  searchLocationIndex: (searchQuery: SearchQuery) => void;
  createLocationsIndexes: () => void;
  searchAllLocations: (searchQuery: SearchQuery) => void;
  loadDirectoryContent: (path: string) => void;
  openURLExternally: (url: string) => void;
  hideDrawer?: () => void;
  searchQuery: () => any;
  setSearchResults: (entries: Array<any>) => void;
  setSearchQuery: (searchQuery: SearchQuery) => void;
  currentDirectory: string;
  indexedEntriesCount: number;
  maxSearchResults: number;
  indexing: boolean;
}

interface State {
  textQuery: string;
  tagsAND: Array<Tag>;
  tagsOR: Array<Tag>;
  tagsNOT: Array<Tag>;
  fileTypes: Array<string>;
  searchBoxing: 'location' | 'folder' | 'global';
  lastModified: string;
  tagTimePeriod: string;
  tagTimePeriodHelper: string;
  tagPlace: string;
  tagPlaceHelper: string;
  tagTimePeriodFrom: Date | null;
  tagTimePeriodTo: Date | null;
  tagPlaceLat: number | null;
  tagPlaceLong: number | null;
  tagPlaceRadius: number;
  fileSize: string;
  forceIndexing: boolean;
  searchMenuOpened: boolean;
  searchMenuAnchorEl: Element | null;
}

class Search extends React.Component<Props, State> {
  // @ts-ignore
  state = {
    textQuery: '',
    tagsAND: [],
    tagsOR: [],
    tagsNOT: [],
    fileTypes: FileTypeGroups.any,
    searchBoxing: 'location',
    lastModified: '',
    tagTimePeriod: '',
    tagTimePeriodHelper: ' ',
    tagPlace: '',
    tagPlaceHelper: ' ',
    tagTimePeriodFrom: null,
    tagTimePeriodTo: null,
    tagPlaceLat: null,
    tagPlaceLong: null,
    tagPlaceRadius: 0,
    forceIndexing: false,
    fileSize: '',
    searchMenuOpened: false,
    searchMenuAnchorEl: null
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const { searchBoxing } = prevState;
    // console.log('Path: ' + nextProps.currentDirectory);
    // if (
    //   Pro &&
    //   (!nextProps.currentDirectory || nextProps.currentDirectory.length < 1)
    // ) {
    //   searchBoxing = 'global';
    // }
    if (
      prevState.tagsAND.length < 1 &&
      nextProps.searchQuery &&
      nextProps.searchQuery.tagsAND
    ) {
      return {
        ...prevState,
        searchBoxing,
        tagsAND: nextProps.searchQuery.tagsAND
      };
    }
    return {
      ...prevState,
      searchBoxing
    };
  }

  componentDidUpdate() {
    const {
      textQuery,
      tagPlace,
      tagTimePeriod,
      tagsAND,
      tagsOR,
      tagsNOT
    } = this.state;
    if (
      !textQuery.length &&
      !tagPlace.length &&
      !tagTimePeriod.length &&
      !tagsAND.length &&
      !tagsOR.length &&
      !tagsNOT.length
    ) {
      this.focusMainSearchFiled();
    }
  }

  mainSearchField;

  focusMainSearchFiled = () => {
    if (this.mainSearchField) {
      this.mainSearchField.focus();
    }
  };

  handleFileTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event;
    const { value, name } = target;

    if (name === 'fileTypes') {
      // @ts-ignore
      this.setState({ fileTypes: value }, () => {
        if (this.state.searchBoxing !== 'global') {
          this.executeSearch();
        }
      });
    }
  };

  handleFileSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event;
    const { value, name } = target;

    if (name === 'fileSize') {
      this.setState({ fileSize: value }, () => {
        if (this.state.searchBoxing !== 'global') {
          this.executeSearch();
        }
      });
    }
  };

  handleLastModifiedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event;
    const { value, name } = target;

    if (name === 'lastModified') {
      this.setState({ lastModified: value }, () => {
        if (this.state.searchBoxing !== 'global') {
          this.executeSearch();
        }
      });
    }
  };

  handleTagFieldChange = (name, value) => {
    // @ts-ignore
    this.setState({ [name]: value }, () => {
      if (this.state.searchBoxing !== 'global') {
        this.executeSearch();
      }
    });
  };

  handleTimePeriodChange = event => {
    const { target } = event;
    const { value } = target;
    let tagTimePeriodHelper = '';
    const { fromDateTime, toDateTime } = extractTimePeriod(value);

    if (toDateTime && fromDateTime) {
      tagTimePeriodHelper =
        'From: ' +
        formatDateTime(fromDateTime) +
        ' To: ' +
        formatDateTime(toDateTime);
    } else {
      tagTimePeriodHelper = '';
    }

    this.setState({
      tagTimePeriod: value,
      tagTimePeriodFrom: fromDateTime,
      tagTimePeriodTo: toDateTime,
      tagTimePeriodHelper
    });
  };

  handlePlaceChange = event => {
    const { target } = event;
    const { value } = target;
    let lat = null;
    let lon = null;
    let tagPlaceHelper;

    if (isPlusCode(value)) {
      const coord = OpenLocationCode.decode(value);
      lat = Number(coord.latitudeCenter.toFixed(7));
      lon = Number(coord.longitudeCenter.toFixed(7));
    } else {
      const latLon = parseLatLon(value);
      if (latLon) {
        lat = latLon.lat;
        lon = latLon.lon;
      }
    }

    if (lat && lon) {
      tagPlaceHelper = 'Place at lat: ' + lat + ' long: ' + lon;
    } else {
      tagPlaceHelper = '';
    }

    this.setState({
      tagPlace: value,
      tagPlaceLat: lat,
      tagPlaceLong: lon,
      tagPlaceHelper
    });
  };

  clickSearchButton = () => {
    this.executeSearch();
    if (this.props.hideDrawer) {
      this.props.hideDrawer();
    }
  };

  openPlace = () => {
    const { tagPlaceLat, tagPlaceLong } = this.state;
    if (tagPlaceLat && tagPlaceLong) {
      PlatformIO.openUrl(
        'https://www.openstreetmap.org/#map=16/' +
          tagPlaceLat +
          '/' +
          tagPlaceLong
      );
    }
  };

  startSearch = event => {
    if (event.key === 'Enter' || event.keyCode === 13) {
      if (this.props.hideDrawer) {
        this.props.hideDrawer();
      }
      this.executeSearch();
    }
  };

  clearSearch = () => {
    const {
      setSearchQuery,
      loadDirectoryContent,
      currentDirectory,
      setSearchResults
    } = this.props;
    setSearchQuery({});
    setTimeout(() => {
      // TODO find solution without settimeout
      this.setState(
        {
          textQuery: '',
          tagsAND: [],
          tagsOR: [],
          tagsNOT: [],
          searchBoxing: 'location',
          fileTypes: FileTypeGroups.any,
          lastModified: '',
          tagTimePeriod: '',
          tagTimePeriodHelper: ' ',
          tagPlace: '',
          tagPlaceHelper: ' ',
          tagTimePeriodFrom: null,
          tagTimePeriodTo: null,
          tagPlaceLat: null,
          tagPlaceLong: null,
          tagPlaceRadius: 0,
          forceIndexing: false,
          fileSize: ''
        },
        () => {
          if (currentDirectory) {
            loadDirectoryContent(currentDirectory);
          } else {
            setSearchResults([]);
          }
          this.focusMainSearchFiled();
        }
      );
    }, 100);
  };

  switchSearchBoxing = (
    event: React.MouseEvent<HTMLElement>,
    boxing: 'location' | 'folder' | 'global'
  ) => {
    this.setState(prevState => ({
      searchBoxing: boxing === null ? prevState.searchBoxing : boxing
    }));
  };

  executeSearch = () => {
    const {
      setSearchQuery,
      searchAllLocations,
      searchLocationIndex
    } = this.props;
    const searchQuery: SearchQuery = {
      textQuery: this.state.textQuery,
      tagsAND: this.state.tagsAND,
      tagsOR: this.state.tagsOR,
      tagsNOT: this.state.tagsNOT,
      // @ts-ignore
      searchBoxing: this.state.searchBoxing,
      fileTypes: this.state.fileTypes,
      lastModified: this.state.lastModified,
      fileSize: this.state.fileSize,
      tagTimePeriodFrom: this.state.tagTimePeriodFrom
        ? this.state.tagTimePeriodFrom.getTime()
        : null,
      tagTimePeriodTo: this.state.tagTimePeriodTo
        ? this.state.tagTimePeriodTo.getTime()
        : null,
      tagPlaceLat: this.state.tagPlaceLat,
      tagPlaceLong: this.state.tagPlaceLong,
      tagPlaceRadius: this.state.tagPlaceRadius,
      maxSearchResults: this.props.maxSearchResults,
      currentDirectory: this.props.currentDirectory,
      forceIndexing: this.state.forceIndexing
    };
    console.log('Search object: ' + JSON.stringify(searchQuery));
    setSearchQuery(searchQuery);
    if (this.state.searchBoxing === 'global') {
      searchAllLocations(searchQuery);
    } else {
      searchLocationIndex(searchQuery);
    }
  };

  handleSearchMenu = (event: any) => {
    this.setState({
      searchMenuOpened: true,
      searchMenuAnchorEl: event.currentTarget
    });
  };

  handleCloseSearchMenu = () => {
    this.setState({ searchMenuOpened: false });
  };

  render() {
    const { classes, indexing, indexedEntriesCount } = this.props;

    return (
      <div className={classes.panel} style={this.props.style}>
        <CustomLogo />
        <div className={classes.toolbar}>
          <Typography
            className={classNames(classes.panelTitle, classes.header)}
            style={{ flex: 0 }}
          >
            {i18n.t('searchTitle')}
          </Typography>
          <Typography
            variant="caption"
            className={classes.header}
            title="Indexed entries in the current location"
            style={{ alignSelf: 'center', paddingLeft: 5, display: 'block' }}
          >
            {indexing
              ? 'disabled while indexing...'
              : indexedEntriesCount + ' indexed entries'}
          </Typography>
          <IconButton
            style={{ marginLeft: 'auto' }}
            data-tid="searchMenu"
            onClick={this.handleSearchMenu}
          >
            <MoreVertIcon />
          </IconButton>
        </div>
        <SearchMenu
          anchorEl={this.state.searchMenuAnchorEl}
          open={this.state.searchMenuOpened}
          onClose={this.handleCloseSearchMenu}
          createLocationsIndexes={this.props.createLocationsIndexes}
          openURLExternally={this.props.openURLExternally}
        />
        <div className={classes.searchArea}>
          <FormControl
            className={classes.formControl}
            style={{ marginTop: 10 }}
            disabled={indexing}
          >
            <OutlinedInput
              id="textQuery"
              name="textQuery"
              value={this.state.textQuery}
              onChange={event => {
                this.setState({ textQuery: event.target.value });
              }}
              inputRef={input => {
                this.mainSearchField = input;
              }}
              margin="dense"
              autoFocus
              onKeyDown={this.startSearch}
              title={i18n.t('core:searchWordsWithInterval')}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={this.clearSearch}
                    size="small"
                    edge="end"
                  >
                    <ClearSearchIcon />
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
          <FormControl className={classes.formControl} disabled={indexing}>
            <ToggleButtonGroup
              onChange={this.switchSearchBoxing}
              size="small"
              exclusive
              style={{ marginBottom: 10, alignSelf: 'center' }}
              value={this.state.searchBoxing}
            >
              <ToggleButton
                value="location"
                title={i18n.t('searchPlaceholder')}
              >
                {i18n.t('location')}
              </ToggleButton>
              <ToggleButton
                value="folder"
                title={i18n.t('searchCurrentFolderWithSubFolders')}
              >
                {i18n.t('folder')}
              </ToggleButton>
              <ToggleButton disabled={!Pro} value="global">
                {i18n.t('globalSearch')}
                <sub>{Pro ? ' BETA' : ' PRO'}</sub>
              </ToggleButton>
            </ToggleButtonGroup>
          </FormControl>
          <br />
          <FormControlLabel
            title={i18n.t('core:enableIndexingBySearch')}
            control={
              <Switch
                checked={this.state.forceIndexing}
                onChange={() =>
                  this.setState(prevState => ({
                    forceIndexing: !prevState.forceIndexing
                  }))
                }
                name="forceIndexing"
              />
            }
            label="Force reindexing all locations"
          />
          <br />
          <br />
          <FormControl className={classes.formControl}>
            <ButtonGroup style={{ justifyContent: 'center' }}>
              <Button
                disabled={indexing}
                id="searchButton"
                variant="outlined"
                color="primary"
                onClick={this.clickSearchButton}
                style={{ width: '90%' }}
                size="small"
              >
                {indexing
                  ? 'Search disabled while indexing'
                  : i18n.t('searchTitle')}
              </Button>
            </ButtonGroup>
          </FormControl>
          <FormControl className={classes.formControl} disabled={indexing}>
            <TagsSelect
              placeholderText={i18n.t('core:selectTags')}
              label={i18n.t('core:mustContainTheseTags')}
              tags={this.state.tagsAND}
              handleChange={this.handleTagFieldChange}
              tagSearchType="tagsAND"
            />
          </FormControl>
          <FormControl className={classes.formControl} disabled={indexing}>
            <TagsSelect
              placeholderText={i18n.t('core:selectTags')}
              tags={this.state.tagsOR}
              label={i18n.t('core:atLeastOneOfTheseTags')}
              handleChange={this.handleTagFieldChange}
              tagSearchType="tagsOR"
            />
          </FormControl>
          <FormControl className={classes.formControl} disabled={indexing}>
            <TagsSelect
              placeholderText={i18n.t('core:selectTags')}
              tags={this.state.tagsNOT}
              label={i18n.t('core:noneOfTheseTags')}
              handleChange={this.handleTagFieldChange}
              tagSearchType="tagsNOT"
            />
          </FormControl>
          <FormControl
            className={classes.formControl}
            disabled={indexing || !Pro}
            title={
              !Pro
                ? i18n.t('core:thisFunctionalityIsAvailableInPro')
                : undefined
            }
          >
            <InputLabel htmlFor="file-type">
              {i18n.t('core:fileType')}
            </InputLabel>
            <Select
              value={this.state.fileTypes}
              onChange={this.handleFileTypeChange}
              input={<Input name="fileTypes" id="file-type" />}
            >
              <MenuItem value={FileTypeGroups.any}>
                {i18n.t('core:anyType')}
              </MenuItem>
              <MenuItem value={FileTypeGroups.folders}>
                <IconButton>
                  <FolderIcon />
                </IconButton>
                {i18n.t('core:searchFolders')}
              </MenuItem>
              <MenuItem value={FileTypeGroups.files}>
                <IconButton>
                  <FileIcon />
                </IconButton>
                {i18n.t('core:searchFiles')}
              </MenuItem>
              <MenuItem value={FileTypeGroups.untagged}>
                <IconButton>
                  <UntaggedIcon />
                </IconButton>
                {i18n.t('core:searchUntaggedEntries')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.images}
                title={FileTypeGroups.images.toString()}
              >
                <IconButton>
                  <PictureIcon />
                </IconButton>
                {i18n.t('core:searchPictures')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.documents}
                title={FileTypeGroups.documents.toString()}
              >
                <IconButton>
                  <DocumentIcon />
                </IconButton>
                {i18n.t('core:searchDocuments')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.notes}
                title={FileTypeGroups.notes.toString()}
              >
                <IconButton>
                  <NoteIcon />
                </IconButton>
                {i18n.t('core:searchNotes')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.audio}
                title={FileTypeGroups.audio.toString()}
              >
                <IconButton>
                  <AudioIcon />
                </IconButton>
                {i18n.t('core:searchAudio')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.video}
                title={FileTypeGroups.video.toString()}
              >
                <IconButton>
                  <VideoIcon />
                </IconButton>
                {i18n.t('core:searchVideoFiles')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.archives}
                title={FileTypeGroups.archives.toString()}
              >
                <IconButton>
                  <ArchiveIcon />
                </IconButton>
                {i18n.t('core:searchArchives')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.bookmarks}
                title={FileTypeGroups.bookmarks.toString()}
              >
                <IconButton>
                  <BookmarkIcon />
                </IconButton>
                {i18n.t('core:searchBookmarks')}
              </MenuItem>
              <MenuItem
                value={FileTypeGroups.ebooks}
                title={FileTypeGroups.ebooks.toString()}
              >
                <IconButton>
                  <BookIcon />
                </IconButton>
                {i18n.t('core:searchEbooks')}
              </MenuItem>
            </Select>
            {/* <FormHelperText>{i18n.t('core:searchFileTypes')}</FormHelperText> */}
          </FormControl>
          <FormControl
            className={classes.formControl}
            disabled={indexing || !Pro}
            title={i18n.t('core:thisFunctionalityIsAvailableInPro')}
          >
            <InputLabel shrink htmlFor="file-size">
              {i18n.t('core:sizeSearchTitle')}
            </InputLabel>
            <Select
              value={this.state.fileSize}
              onChange={this.handleFileSizeChange}
              input={<Input name="fileSize" id="file-size" />}
              displayEmpty
            >
              <MenuItem value="">{i18n.t('core:sizeAny')}</MenuItem>
              <MenuItem value="sizeEmpty">{i18n.t('core:sizeEmpty')}</MenuItem>
              <MenuItem value="sizeTiny">
                {i18n.t('core:sizeTiny')}
                &nbsp;(&lt;&nbsp;10KB)
              </MenuItem>
              <MenuItem value="sizeVerySmall">
                {i18n.t('core:sizeVerySmall')}
                &nbsp;(&lt;&nbsp;100KB)
              </MenuItem>
              <MenuItem value="sizeSmall">
                {i18n.t('core:sizeSmall')}
                &nbsp;(&lt;&nbsp;1MB)
              </MenuItem>
              <MenuItem value="sizeMedium">
                {i18n.t('core:sizeMedium')}
                &nbsp;(&lt;&nbsp;50MB)
              </MenuItem>
              <MenuItem value="sizeLarge">
                {i18n.t('core:sizeLarge')}
                &nbsp;(&lt;&nbsp;1GB)
              </MenuItem>
              <MenuItem value="sizeHuge">
                {i18n.t('core:sizeHuge')}
                &nbsp;(&gt;&nbsp;1GB)
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl
            className={classes.formControl}
            disabled={indexing || !Pro}
            title={
              !Pro
                ? i18n.t('core:thisFunctionalityIsAvailableInPro')
                : undefined
            }
          >
            <InputLabel shrink htmlFor="modification-date">
              {i18n.t('core:lastModifiedSearchTitle')}
            </InputLabel>
            <Select
              value={this.state.lastModified}
              onChange={this.handleLastModifiedChange}
              input={<Input name="lastModified" id="modification-date" />}
              displayEmpty
            >
              <MenuItem value="">{i18n.t('core:anyTime')}</MenuItem>
              <MenuItem value="today">{i18n.t('core:today')}</MenuItem>
              <MenuItem value="yesterday">{i18n.t('core:yesterday')}</MenuItem>
              <MenuItem value="past7Days">{i18n.t('core:past7Days')}</MenuItem>
              <MenuItem value="past30Days">
                {i18n.t('core:past30Days')}
              </MenuItem>
              <MenuItem value="past6Months">
                {i18n.t('core:past6Months')}
              </MenuItem>
              <MenuItem value="pastYear">{i18n.t('core:pastYear')}</MenuItem>
              <MenuItem value="moreThanYear">
                {i18n.t('core:moreThanYear')}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl
            className={classes.formControl}
            title={
              !Pro
                ? i18n.t('core:thisFunctionalityIsAvailableInPro')
                : undefined
            }
          >
            <TextField
              id="tagTimePeriod"
              label={i18n.t('Enter time period')}
              value={this.state.tagTimePeriod}
              disabled={indexing || !Pro}
              onChange={this.handleTimePeriodChange}
              onKeyDown={this.startSearch}
              helperText={this.state.tagTimePeriodHelper}
              error={this.state.tagTimePeriodHelper.length < 1}
              InputProps={{
                endAdornment: (
                  <InputAdornment
                    position="end"
                    title="201905 for May 2019 / 20190412 for 12th of April 2019 / 20190501~124523 for specific time"
                  >
                    <IconButton>
                      <DateIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              id="tagPlace"
              label={i18n.t('GPS coordinates or plus code')}
              value={this.state.tagPlace}
              disabled={indexing || !Pro}
              onChange={this.handlePlaceChange}
              onKeyDown={this.startSearch}
              helperText={this.state.tagPlaceHelper}
              error={this.state.tagPlaceHelper.length < 1}
              InputProps={{
                endAdornment: (
                  <InputAdornment
                    position="end"
                    title="GPS: 49.23276,12.43123 PlusCode: 8FRG8Q87+6X"
                  >
                    <IconButton onClick={this.openPlace}>
                      <PlaceIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </FormControl>
          <FormControl className={classes.formControl}>
            <ButtonGroup style={{ justifyContent: 'center' }}>
              {/* <Button
                disabled={indexing}
                id="searchButton"
                variant="outlined"
                color="primary"
                onClick={this.clickSearchButton}
                style={{ width: '70%' }}
              >
                {indexing
                  ? 'Search disabled while indexing'
                  : i18n.t('searchTitle')}
              </Button> */}
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                style={{ width: '90%' }}
                onClick={this.clearSearch}
                id="resetSearchButton"
              >
                {i18n.t('resetBtn')}
              </Button>
            </ButtonGroup>
          </FormControl>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    indexing: isIndexing(state),
    searchQuery: getSearchQuery(state),
    currentDirectory: getDirectoryPath(state),
    indexedEntriesCount: getIndexedEntriesCount(state),
    maxSearchResults: getMaxSearchResults(state)
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      searchAllLocations: LocationIndexActions.searchAllLocations,
      setSearchQuery: LocationIndexActions.setSearchQuery,
      searchLocationIndex: LocationIndexActions.searchLocationIndex,
      createLocationsIndexes: LocationIndexActions.createLocationsIndexes,
      loadDirectoryContent: AppActions.loadDirectoryContent,
      openURLExternally: AppActions.openURLExternally,
      setSearchResults: AppActions.setSearchResults
    },
    dispatch
  );
}

export default withStyles(styles)(
  connect(mapStateToProps, mapDispatchToProps)(Search)
);
